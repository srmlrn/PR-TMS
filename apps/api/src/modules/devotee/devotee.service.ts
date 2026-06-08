import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  collectEmailAddresses,
  collectPhoneNumbers,
  CreateDevoteeInput,
  CreateDevoteeResponse,
  Currency,
  DEMO_TENANT_IDS,
  Devotee,
  DevoteeDuplicateCheck,
  GANESHA_TEMPLE_ID,
  hydrateDevoteeContacts,
  normalizePhoneNumber,
  PaginatedResponse,
  syncPrimaryContacts,
  SV_TEMPLE_ID,
  UpdateDevoteeInput,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { DevoteeEntity } from '../../database/entities/tenant/devotee.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { UpdateDevoteeDto } from './dto/update-devotee.dto';

type DevoteeRecord = Devotee & TenantEntity;

const DEMO_TENANT = SV_TEMPLE_ID;

@Injectable()
export class DevoteeService
  extends BaseTenantService<DevoteeRecord>
  implements OnModuleInit
{
  protected store = new Map<string, DevoteeRecord>();

  constructor(private readonly tenantData: TenantDataService) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      for (const tenantId of DEMO_TENANT_IDS) {
        this.seedDemoData(tenantId);
      }
    }
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: { name?: string; phone?: string; gotram?: string },
  ): Promise<PaginatedResponse<DevoteeRecord>> {
    if (this.usePostgres) {
      const repo = await this.tenantData.devotees();
      const qb = repo.createQueryBuilder('d');

      if (filters?.name) {
        const term = `%${filters.name.toLowerCase()}%`;
        qb.andWhere(
          '(LOWER(d.firstName) LIKE :term OR LOWER(d.lastName) LIKE :term)',
          { term },
        );
      }
      if (filters?.phone) {
        qb.andWhere("regexp_replace(d.phone, '[^0-9]', '', 'g') LIKE :phone", {
          phone: `%${filters.phone.replace(/\D/g, '')}%`,
        });
      }
      if (filters?.gotram) {
        qb.andWhere('LOWER(d.gotram) LIKE :gotram', {
          gotram: `%${filters.gotram.toLowerCase()}%`,
        });
      }

      qb.orderBy('d.lastName', 'ASC');
      const total = await qb.getCount();
      const rows = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      return {
        data: rows.map((r) => this.toDevotee(r)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    let items = this.scoped(tenantId);

    if (filters?.name) {
      const term = filters.name.toLowerCase();
      items = items.filter(
        (d) =>
          d.firstName.toLowerCase().includes(term) ||
          d.lastName.toLowerCase().includes(term) ||
          `${d.firstName} ${d.lastName}`.toLowerCase().includes(term),
      );
    }

    if (filters?.phone) {
      const normalized = this.normalizePhone(filters.phone);
      items = items.filter((d) =>
        this.normalizePhone(d.phone).includes(normalized),
      );
    }

    if (filters?.gotram) {
      const term = filters.gotram.toLowerCase();
      items = items.filter((d) => d.gotram?.toLowerCase().includes(term));
    }

    items.sort((a, b) => a.lastName.localeCompare(b.lastName));
    return this.paginate(items, page, limit);
  }

  async findFamilyMembers(
    tenantId: string,
    familyId: string,
    excludeId?: string,
  ): Promise<DevoteeRecord[]> {
    if (!familyId) return [];

    if (this.usePostgres) {
      const repo = await this.tenantData.devotees();
      const rows = await repo.find({
        where: { familyId },
        order: { lastName: 'ASC' },
      });
      return rows
        .map((r) => this.toDevotee(r))
        .filter((d) => d.id !== excludeId);
    }

    return this.scoped(tenantId).filter(
      (d) => d.familyId === familyId && d.id !== excludeId,
    );
  }

  async findOne(tenantId: string, id: string): Promise<DevoteeRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.devotees();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Devotee ${id} not found`);
      }
      return this.toDevotee(row);
    }

    const devotee = this.findOneScoped(tenantId, id);
    if (!devotee) {
      throw new NotFoundException(`Devotee ${id} not found`);
    }
    return devotee;
  }

  async checkDuplicates(
    tenantId: string,
    phone?: string,
    email?: string,
    options?: { phones?: string[]; emails?: string[]; excludeId?: string },
  ): Promise<DevoteeDuplicateCheck> {
    const result: DevoteeDuplicateCheck = {};
    const phoneTerms = new Set<string>();
    const emailTerms = new Set<string>();

    for (const p of options?.phones ?? []) {
      if (p.trim()) phoneTerms.add(normalizePhoneNumber(p));
    }
    if (phone?.trim()) phoneTerms.add(normalizePhoneNumber(phone));

    for (const e of options?.emails ?? []) {
      if (e.trim()) emailTerms.add(e.trim().toLowerCase());
    }
    if (email?.trim()) emailTerms.add(email.trim().toLowerCase());

    if (phoneTerms.size === 0 && emailTerms.size === 0) {
      return result;
    }

    const items = this.usePostgres
      ? (await this.findAll(tenantId, 1, 500)).data
      : this.scoped(tenantId);

    for (const devotee of items) {
      if (options?.excludeId && devotee.id === options.excludeId) continue;
      const hydrated = hydrateDevoteeContacts(devotee);

      if (!result.phoneMatch && phoneTerms.size > 0) {
        const devoteePhones = collectPhoneNumbers(hydrated);
        const hit = devoteePhones.some((p) => phoneTerms.has(p));
        if (hit) result.phoneMatch = this.duplicateSummary(hydrated);
      }

      if (!result.emailMatch && emailTerms.size > 0) {
        const devoteeEmails = collectEmailAddresses(hydrated);
        const hit = devoteeEmails.some((e) => emailTerms.has(e));
        if (hit) result.emailMatch = this.duplicateSummary(hydrated);
      }

      if (result.phoneMatch && result.emailMatch) break;
    }

    return result;
  }

  async create(
    tenantId: string,
    input: CreateDevoteeInput,
    options?: { blockOnDuplicate?: boolean },
  ): Promise<CreateDevoteeResponse> {
    const synced = syncPrimaryContacts(input);
    const duplicates = await this.checkDuplicates(
      tenantId,
      synced.phone,
      synced.email,
      {
        phones: collectPhoneNumbers(synced),
        emails: collectEmailAddresses(synced),
      },
    );

    if (options?.blockOnDuplicate && duplicates.phoneMatch) {
      throw new ConflictException({
        message: 'A devotee with this phone number already exists',
        duplicate: duplicates.phoneMatch,
      });
    }

    const payload = this.buildDevoteePayload(input);
    let devotee: DevoteeRecord;

    if (this.usePostgres) {
      const repo = await this.tenantData.devotees();
      const entity = repo.create({ ...payload, status: 'active' });
      const saved = await repo.save(entity);
      devotee = this.toDevotee(saved);
    } else {
      devotee = this.createEntity(tenantId, {
        ...payload,
        status: 'active',
      });
    }

    if (duplicates.phoneMatch || duplicates.emailMatch) {
      return { ...devotee, duplicateWarning: duplicates };
    }

    return devotee;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateDevoteeDto,
  ): Promise<DevoteeRecord> {
    const existing = await this.findOne(tenantId, id);
    const patch = this.buildUpdatePatch(existing, dto);

    if (this.usePostgres) {
      const repo = await this.tenantData.devotees();
      await repo.update(id, patch);
      const updated = await repo.findOneOrFail({ where: { id } });
      return this.toDevotee(updated);
    }

    return this.updateEntity(tenantId, id, patch);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    if (this.usePostgres) {
      await this.findOne(tenantId, id);
      const repo = await this.tenantData.devotees();
      await repo.delete(id);
      return;
    }

    await this.findOne(tenantId, id);
    this.store.delete(id);
  }

  async exists(tenantId: string, id: string): Promise<boolean> {
    if (this.usePostgres) {
      const repo = await this.tenantData.devotees();
      const count = await repo.count({ where: { id } });
      return count > 0;
    }
    return this.findOneScoped(tenantId, id) !== undefined;
  }

  private toDevotee(row: DevoteeEntity): DevoteeRecord {
    return hydrateDevoteeContacts({
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      firstName: row.firstName,
      lastName: row.lastName,
      title: row.title as Devotee['title'],
      email: row.email,
      phone: row.phone,
      country: row.country,
      gotram: row.gotram,
      nakshatra: row.nakshatra,
      rashi: row.rashi,
      gender: row.gender as Devotee['gender'],
      dateOfBirth: row.dateOfBirth,
      photoUrl: row.photoUrl,
      familyId: row.familyId,
      taxId: row.taxId,
      isNri: row.isNri,
      communicationOptIn: row.communicationOptIn,
      preferredLanguage: row.preferredLanguage,
      indiaState: row.indiaState,
      phones: row.phones,
      emails: row.emails,
      addresses: row.addresses,
      importantDates: row.importantDates,
      address: row.address,
      membershipTier: row.membershipTier,
      membershipExpiresAt: row.membershipExpiresAt,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private buildDevoteePayload(input: CreateDevoteeInput) {
    const synced = syncPrimaryContacts(input);
    return {
      firstName: input.firstName,
      lastName: input.lastName,
      title: input.title,
      email: synced.email,
      phone: synced.phone,
      country: input.country,
      gotram: input.gotram,
      nakshatra: input.nakshatra,
      rashi: input.rashi,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      photoUrl: input.photoUrl,
      familyId: input.familyId,
      taxId: input.taxId,
      isNri: input.isNri ?? false,
      communicationOptIn: input.communicationOptIn ?? true,
      preferredLanguage: input.preferredLanguage,
      indiaState: input.indiaState,
      phones: synced.phones.length > 0 ? synced.phones : undefined,
      emails: synced.emails.length > 0 ? synced.emails : undefined,
      addresses: synced.addresses.length > 0 ? synced.addresses : undefined,
      importantDates: input.importantDates,
      address: synced.address,
    };
  }

  private buildUpdatePatch(
    existing: DevoteeRecord,
    dto: UpdateDevoteeDto,
  ): Partial<DevoteeRecord> {
    const patch: Partial<DevoteeRecord> = {};
    const contactInput: UpdateDevoteeInput = {
      phone: dto.phone ?? existing.phone,
      email: dto.email ?? existing.email,
      address:
        dto.address !== undefined
          ? dto.address.line1
            ? {
                line1: dto.address.line1,
                line2: dto.address.line2,
                city: dto.address.city ?? '',
                state: dto.address.state,
                postalCode: dto.address.postalCode,
                country: dto.address.country ?? existing.country,
              }
            : undefined
          : existing.address,
      phones: dto.phones ?? existing.phones,
      emails: dto.emails ?? existing.emails,
      addresses: dto.addresses ?? existing.addresses,
      country: dto.country ?? existing.country,
    };
    const contactsTouched =
      dto.phone !== undefined ||
      dto.email !== undefined ||
      dto.address !== undefined ||
      dto.phones !== undefined ||
      dto.emails !== undefined ||
      dto.addresses !== undefined ||
      dto.country !== undefined;

    if (contactsTouched) {
      const synced = syncPrimaryContacts(contactInput);
      patch.phone = synced.phone;
      patch.email = synced.email;
      patch.address = synced.address;
      patch.phones = synced.phones.length > 0 ? synced.phones : undefined;
      patch.emails = synced.emails.length > 0 ? synced.emails : undefined;
      patch.addresses = synced.addresses.length > 0 ? synced.addresses : undefined;
    }

    if (dto.firstName !== undefined) patch.firstName = dto.firstName;
    if (dto.lastName !== undefined) patch.lastName = dto.lastName;
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.country !== undefined) patch.country = dto.country;
    if (dto.gotram !== undefined) patch.gotram = dto.gotram;
    if (dto.nakshatra !== undefined) patch.nakshatra = dto.nakshatra;
    if (dto.rashi !== undefined) patch.rashi = dto.rashi;
    if (dto.gender !== undefined) patch.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) patch.dateOfBirth = dto.dateOfBirth;
    if (dto.photoUrl !== undefined) patch.photoUrl = dto.photoUrl;
    if (dto.familyId !== undefined) patch.familyId = dto.familyId;
    if (dto.taxId !== undefined) patch.taxId = dto.taxId;
    if (dto.isNri !== undefined) patch.isNri = dto.isNri;
    if (dto.communicationOptIn !== undefined) {
      patch.communicationOptIn = dto.communicationOptIn;
    }
    if (dto.preferredLanguage !== undefined) {
      patch.preferredLanguage = dto.preferredLanguage;
    }
    if (dto.indiaState !== undefined) patch.indiaState = dto.indiaState;
    if (dto.importantDates !== undefined) patch.importantDates = dto.importantDates;
    if (dto.membershipTier !== undefined) patch.membershipTier = dto.membershipTier;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.membershipExpiresAt !== undefined) {
      patch.membershipExpiresAt = new Date(dto.membershipExpiresAt);
    }

    return patch;
  }

  private duplicateSummary(
    devotee: DevoteeRecord,
  ): DevoteeDuplicateCheck['phoneMatch'] {
    return {
      id: devotee.id,
      firstName: devotee.firstName,
      lastName: devotee.lastName,
      phone: devotee.phone,
      email: devotee.email,
    };
  }

  private normalizePhone(phone: string): string {
    return normalizePhoneNumber(phone);
  }

  private seedDemoData(tenantId: string): void {
    if (this.scoped(tenantId).length > 0) {
      return;
    }

    const now = new Date();
    const isGanesha = tenantId === GANESHA_TEMPLE_ID;

    const seedDevotees: Array<Omit<DevoteeRecord, 'createdAt' | 'updatedAt'>> = isGanesha
      ? [
          {
            id: 'sgt-dev-amit-reddy',
            tenantId,
            firstName: 'Amit',
            lastName: 'Reddy',
            email: 'amit@ex.com',
            phone: '+1 615-555-0142',
            country: 'US',
            gotram: 'Kashyapa',
            nakshatra: 'Ashwini',
            membershipTier: 'Patron',
            ytdDonations: { amount: 2200, currency: Currency.USD },
            status: 'active',
          },
          {
            id: 'sgt-dev-priya-iyer',
            tenantId,
            firstName: 'Priya',
            lastName: 'Iyer',
            phone: '+1 615-555-0198',
            country: 'US',
            gotram: 'Bharadwaja',
            membershipTier: 'Annual',
            ytdDonations: { amount: 650, currency: Currency.USD },
            status: 'active',
          },
          {
            id: 'sgt-dev-raj-natarajan',
            tenantId,
            firstName: 'Raj',
            lastName: 'Natarajan',
            email: 'raj@ex.com',
            phone: '+1 615-555-0211',
            country: 'US',
            gotram: 'Atri',
            nakshatra: 'Rohini',
            gender: 'male',
            dateOfBirth: '1978-07-27',
            familyId: 'fam-natarajan',
            membershipTier: 'Annual',
            ytdDonations: { amount: 400, currency: Currency.USD },
            status: 'active',
            address: {
              line1: '865 Bellevue Rd, J13',
              city: 'Nashville',
              state: 'TN',
              postalCode: '37221',
              country: 'US',
            },
          },
          {
            id: 'sgt-dev-swetha-natarajan',
            tenantId,
            firstName: 'Swetha',
            lastName: 'Natarajan',
            phone: '+1 615-555-0212',
            country: 'US',
            gotram: 'Atri',
            familyId: 'fam-natarajan',
            membershipTier: 'Annual',
            status: 'active',
          },
        ]
      : [
      {
        id: 'dev-rajan-krishnamurthy',
        tenantId,
        firstName: 'Rajan',
        lastName: 'Krishnamurthy',
        email: 'rajan@ex.com',
        phone: '+1 510-555-0191',
        country: 'US',
        gotram: 'Bharadwaja',
        nakshatra: 'Rohini',
        membershipTier: 'Patron',
        ytdDonations: { amount: 1850, currency: Currency.USD },
        status: 'active',
      },
      {
        id: 'dev-priya-sharma',
        tenantId: DEMO_TENANT,
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '+91 98765-43210',
        country: 'IN',
        gotram: 'Kashyapa',
        membershipTier: 'Annual',
        ytdDonations: { amount: 12500, currency: Currency.INR },
        status: 'active',
      },
      {
        id: 'dev-meena-patel',
        tenantId: DEMO_TENANT,
        firstName: 'Meena',
        lastName: 'Patel',
        phone: '+1 647-555-0303',
        country: 'CA',
        gotram: 'Vasishtha',
        membershipTier: 'Annual',
        ytdDonations: { amount: 820, currency: Currency.CAD },
        status: 'renewal_due',
      },
    ];

    for (const devotee of seedDevotees) {
      this.store.set(devotee.id, {
        ...devotee,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

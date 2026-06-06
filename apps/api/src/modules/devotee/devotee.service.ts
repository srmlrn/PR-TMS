import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  CreateDevoteeInput,
  Currency,
  Devotee,
  PaginatedResponse,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { DevoteeEntity } from '../../database/entities/tenant/devotee.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { UpdateDevoteeDto } from './dto/update-devotee.dto';

type DevoteeRecord = Devotee & TenantEntity;

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

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
      this.seedDemoData();
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

  async create(tenantId: string, input: CreateDevoteeInput): Promise<DevoteeRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.devotees();
      const entity = repo.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        country: input.country,
        gotram: input.gotram,
        nakshatra: input.nakshatra,
        status: 'active',
      });
      const saved = await repo.save(entity);
      return this.toDevotee(saved);
    }

    return this.createEntity(tenantId, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      country: input.country,
      gotram: input.gotram,
      nakshatra: input.nakshatra,
      status: 'active',
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateDevoteeDto,
  ): Promise<DevoteeRecord> {
    if (this.usePostgres) {
      await this.findOne(tenantId, id);
      const repo = await this.tenantData.devotees();
      await repo.update(id, {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.gotram !== undefined && { gotram: dto.gotram }),
        ...(dto.nakshatra !== undefined && { nakshatra: dto.nakshatra }),
        ...(dto.membershipTier !== undefined && { membershipTier: dto.membershipTier }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.membershipExpiresAt !== undefined && {
          membershipExpiresAt: new Date(dto.membershipExpiresAt),
        }),
      });
      const updated = await repo.findOneOrFail({ where: { id } });
      return this.toDevotee(updated);
    }

    const existing = this.findOneScoped(tenantId, id);
    if (!existing) {
      throw new NotFoundException(`Devotee ${id} not found`);
    }

    const patch: Partial<DevoteeRecord> = {};

    if (dto.firstName !== undefined) patch.firstName = dto.firstName;
    if (dto.lastName !== undefined) patch.lastName = dto.lastName;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.country !== undefined) patch.country = dto.country;
    if (dto.gotram !== undefined) patch.gotram = dto.gotram;
    if (dto.nakshatra !== undefined) patch.nakshatra = dto.nakshatra;
    if (dto.membershipTier !== undefined) patch.membershipTier = dto.membershipTier;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.membershipExpiresAt !== undefined) {
      patch.membershipExpiresAt = new Date(dto.membershipExpiresAt);
    }
    if (dto.address !== undefined) {
      patch.address = dto.address.line1
        ? {
            line1: dto.address.line1,
            line2: dto.address.line2,
            city: dto.address.city ?? '',
            state: dto.address.state,
            postalCode: dto.address.postalCode,
            country: dto.address.country ?? '',
          }
        : undefined;
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
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      country: row.country,
      gotram: row.gotram,
      nakshatra: row.nakshatra,
      membershipTier: row.membershipTier,
      membershipExpiresAt: row.membershipExpiresAt,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private seedDemoData(): void {
    if (this.scoped(DEMO_TENANT).length > 0) {
      return;
    }

    const now = new Date();

    const seedDevotees: Array<Omit<DevoteeRecord, 'createdAt' | 'updatedAt'>> = [
      {
        id: 'dev-rajan-krishnamurthy',
        tenantId: DEMO_TENANT,
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

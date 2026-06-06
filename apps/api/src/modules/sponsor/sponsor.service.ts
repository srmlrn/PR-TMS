import {
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  Currency,
  RecognitionItem,
  Sponsor,
  SponsorPipelineStage,
  SponsorTier,
} from '@tms/types';
import { v4 as uuidv4 } from 'uuid';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { RecognitionItemEntity } from '../../database/entities/tenant/recognition-item.entity';
import { SponsorEntity } from '../../database/entities/tenant/sponsor.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';

type SponsorRecord = Sponsor & TenantEntity;

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';
const RENEWAL_WINDOW_DAYS = 90;

@Injectable()
export class SponsorService
  extends BaseTenantService<SponsorRecord>
  implements OnModuleInit
{
  protected store = new Map<string, SponsorRecord>();
  private recognitionStore = new Map<string, RecognitionItem>();

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
    tier?: SponsorTier,
    pipelineStage?: SponsorPipelineStage,
  ) {
    if (this.usePostgres) {
      const repo = await this.tenantData.sponsors();
      const qb = repo.createQueryBuilder('s');
      if (tier) {
        qb.andWhere('s.tier = :tier', { tier });
      }
      if (pipelineStage) {
        qb.andWhere('s.pipelineStage = :pipelineStage', { pipelineStage });
      }
      qb.orderBy('s.name', 'ASC');
      const total = await qb.getCount();
      const rows = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
      return {
        data: rows.map((r) => this.toSponsor(r)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    let items = this.scoped(tenantId);
    if (tier) {
      items = items.filter((s) => s.tier === tier);
    }
    if (pipelineStage) {
      items = items.filter((s) => s.pipelineStage === pipelineStage);
    }
    items.sort((a, b) => a.name.localeCompare(b.name));
    return this.paginate(items, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<SponsorRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.sponsors();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Sponsor ${id} not found`);
      }
      return this.toSponsor(row);
    }

    const sponsor = this.findOneScoped(tenantId, id);
    if (!sponsor) {
      throw new NotFoundException(`Sponsor ${id} not found`);
    }
    return sponsor;
  }

  async create(tenantId: string, dto: CreateSponsorDto): Promise<SponsorRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.sponsors();
      const entity = repo.create({
        name: dto.name,
        type: dto.type,
        tier: dto.tier,
        pipelineStage: dto.pipelineStage ?? SponsorPipelineStage.LEAD,
        primaryContact: dto.primaryContact,
        email: dto.email,
        phone: dto.phone,
        committedAmount: dto.committedAmount,
        paidAmount: dto.paidAmount ?? 0,
        currency: dto.currency,
        renewsAt: dto.renewsAt ? new Date(dto.renewsAt) : undefined,
        relationshipManager: dto.relationshipManager,
      });
      const saved = await repo.save(entity);
      await this.seedRecognitionItemsPostgres(saved.id, dto.tier);
      return this.toSponsor(saved);
    }

    const sponsor = this.createEntity(tenantId, {
      name: dto.name,
      type: dto.type,
      tier: dto.tier,
      pipelineStage: dto.pipelineStage ?? SponsorPipelineStage.LEAD,
      primaryContact: dto.primaryContact,
      email: dto.email,
      phone: dto.phone,
      committedAmount: dto.committedAmount,
      paidAmount: dto.paidAmount ?? 0,
      currency: dto.currency,
      renewsAt: dto.renewsAt ? new Date(dto.renewsAt) : undefined,
      relationshipManager: dto.relationshipManager,
    });

    this.seedRecognitionItems(tenantId, sponsor.id, dto.tier);
    return sponsor;
  }

  async update(tenantId: string, id: string, dto: UpdateSponsorDto): Promise<SponsorRecord> {
    await this.findOne(tenantId, id);

    if (this.usePostgres) {
      const repo = await this.tenantData.sponsors();
      await repo.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.tier !== undefined && { tier: dto.tier }),
        ...(dto.pipelineStage !== undefined && { pipelineStage: dto.pipelineStage }),
        ...(dto.primaryContact !== undefined && { primaryContact: dto.primaryContact }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.committedAmount !== undefined && { committedAmount: dto.committedAmount }),
        ...(dto.paidAmount !== undefined && { paidAmount: dto.paidAmount }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.relationshipManager !== undefined && {
          relationshipManager: dto.relationshipManager,
        }),
        ...(dto.renewsAt !== undefined && { renewsAt: new Date(dto.renewsAt) }),
      });
      const updated = await repo.findOneOrFail({ where: { id } });
      return this.toSponsor(updated);
    }

    const patch: Partial<SponsorRecord> = {};

    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.tier !== undefined) patch.tier = dto.tier;
    if (dto.pipelineStage !== undefined) patch.pipelineStage = dto.pipelineStage;
    if (dto.primaryContact !== undefined) patch.primaryContact = dto.primaryContact;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.committedAmount !== undefined) patch.committedAmount = dto.committedAmount;
    if (dto.paidAmount !== undefined) patch.paidAmount = dto.paidAmount;
    if (dto.currency !== undefined) patch.currency = dto.currency;
    if (dto.relationshipManager !== undefined) {
      patch.relationshipManager = dto.relationshipManager;
    }
    if (dto.renewsAt !== undefined) patch.renewsAt = new Date(dto.renewsAt);

    return this.updateEntity(tenantId, id, patch);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);

    if (this.usePostgres) {
      const recRepo = await this.tenantData.recognitionItems();
      await recRepo.delete({ sponsorId: id });
      const repo = await this.tenantData.sponsors();
      await repo.delete(id);
      return;
    }

    this.store.delete(id);
    for (const [key, item] of this.recognitionStore) {
      if (item.sponsorId === id && item.tenantId === tenantId) {
        this.recognitionStore.delete(key);
      }
    }
  }

  async getRecognition(tenantId: string, sponsorId: string): Promise<RecognitionItem[]> {
    await this.findOne(tenantId, sponsorId);

    if (this.usePostgres) {
      const repo = await this.tenantData.recognitionItems();
      const rows = await repo.find({ where: { sponsorId } });
      return rows.map((r) => this.toRecognitionItem(r));
    }

    return [...this.recognitionStore.values()].filter(
      (item) => item.tenantId === tenantId && item.sponsorId === sponsorId,
    );
  }

  async updateRecognitionItem(
    tenantId: string,
    sponsorId: string,
    itemId: string,
    isFulfilled: boolean,
  ): Promise<RecognitionItem> {
    await this.findOne(tenantId, sponsorId);

    if (this.usePostgres) {
      const repo = await this.tenantData.recognitionItems();
      const row = await repo.findOne({ where: { id: itemId, sponsorId } });
      if (!row) {
        throw new NotFoundException(`Recognition item ${itemId} not found`);
      }
      row.isFulfilled = isFulfilled;
      row.fulfilledAt = isFulfilled ? new Date() : undefined;
      const saved = await repo.save(row);
      return this.toRecognitionItem(saved);
    }

    const item = this.recognitionStore.get(itemId);
    if (!item || item.tenantId !== tenantId || item.sponsorId !== sponsorId) {
      throw new NotFoundException(`Recognition item ${itemId} not found`);
    }

    const updated: RecognitionItem = {
      ...item,
      isFulfilled,
      fulfilledAt: isFulfilled ? new Date() : undefined,
    };
    this.recognitionStore.set(itemId, updated);
    return updated;
  }

  async getRenewalsDue(tenantId: string): Promise<SponsorRecord[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + RENEWAL_WINDOW_DAYS);

    if (this.usePostgres) {
      const repo = await this.tenantData.sponsors();
      const rows = await repo
        .createQueryBuilder('s')
        .where('s.renewsAt IS NOT NULL')
        .andWhere('s.renewsAt <= :cutoff', { cutoff })
        .getMany();
      return rows.map((r) => this.toSponsor(r));
    }

    return this.scoped(tenantId).filter((sponsor) => {
      if (!sponsor.renewsAt) {
        return false;
      }
      return sponsor.renewsAt <= cutoff;
    });
  }

  private toSponsor(row: SponsorEntity): SponsorRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      name: row.name,
      type: row.type as Sponsor['type'],
      tier: row.tier as SponsorTier,
      pipelineStage: row.pipelineStage as SponsorPipelineStage,
      primaryContact: row.primaryContact,
      email: row.email,
      phone: row.phone,
      committedAmount: Number(row.committedAmount),
      paidAmount: Number(row.paidAmount),
      currency: row.currency as Currency,
      renewsAt: row.renewsAt,
      relationshipManager: row.relationshipManager,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toRecognitionItem(row: RecognitionItemEntity): RecognitionItem {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      sponsorId: row.sponsorId,
      item: row.item,
      isFulfilled: row.isFulfilled,
      fulfilledAt: row.fulfilledAt,
    };
  }

  private async seedRecognitionItemsPostgres(
    sponsorId: string,
    tier: SponsorTier,
  ): Promise<void> {
    const repo = await this.tenantData.recognitionItems();
    const items = this.defaultRecognitionItems(tier);
    await repo.save(
      items.map((title) =>
        repo.create({ sponsorId, item: title, isFulfilled: false }),
      ),
    );
  }

  private seedRecognitionItems(
    tenantId: string,
    sponsorId: string,
    tier: SponsorTier,
  ): void {
    const items = this.defaultRecognitionItems(tier);
    for (const title of items) {
      const item: RecognitionItem = {
        id: uuidv4(),
        tenantId,
        sponsorId,
        item: title,
        isFulfilled: false,
      };
      this.recognitionStore.set(item.id, item);
    }
  }

  private defaultRecognitionItems(tier: SponsorTier): string[] {
    const base = ['Thank-you certificate', 'Website acknowledgement'];
    if (tier === SponsorTier.PLATINUM || tier === SponsorTier.GOLD) {
      base.push('PA announcement', 'Event banner placement');
    }
    if (tier === SponsorTier.PLATINUM) {
      base.push('Live stream sponsor credit', 'Annual report feature');
    }
    return base;
  }

  private seedDemoData(): void {
    if (this.scoped(DEMO_TENANT).length > 0) {
      return;
    }

    const infosys = this.createEntity(DEMO_TENANT, {
      name: 'Infosys BPM Ltd.',
      type: 'corporate',
      tier: SponsorTier.PLATINUM,
      pipelineStage: SponsorPipelineStage.ACTIVE,
      primaryContact: 'San Jose Partnership Office',
      email: 'partnerships@infosys.com',
      committedAmount: 25_000,
      paidAmount: 25_000,
      currency: Currency.USD,
      renewsAt: new Date('2026-12-31'),
      relationshipManager: 'Ravi Sharma',
    });

    const krishnamurthy = this.createEntity(DEMO_TENANT, {
      name: 'Krishnamurthy Family',
      type: 'family',
      tier: SponsorTier.GOLD,
      pipelineStage: SponsorPipelineStage.ACTIVE,
      primaryContact: 'Rajan Krishnamurthy',
      email: 'rajan.k@example.com',
      committedAmount: 10_000,
      paidAmount: 7_500,
      currency: Currency.USD,
      renewsAt: new Date('2027-06-08'),
      relationshipManager: 'Priya Nair',
    });

    this.seedRecognitionItems(DEMO_TENANT, infosys.id, SponsorTier.PLATINUM);
    this.markRecognitionFulfilled(DEMO_TENANT, infosys.id, [
      'Thank-you certificate',
      'Website acknowledgement',
      'PA announcement',
      'Event banner placement',
      'Live stream sponsor credit',
      'Annual report feature',
    ]);

    this.seedRecognitionItems(DEMO_TENANT, krishnamurthy.id, SponsorTier.GOLD);
    this.markRecognitionFulfilled(DEMO_TENANT, krishnamurthy.id, [
      'Thank-you certificate',
      'Website acknowledgement',
    ]);
  }

  private markRecognitionFulfilled(
    tenantId: string,
    sponsorId: string,
    fulfilledTitles: string[],
  ): void {
    for (const item of [...this.recognitionStore.values()].filter(
      (i) => i.tenantId === tenantId && i.sponsorId === sponsorId,
    )) {
      if (fulfilledTitles.includes(item.item)) {
        this.recognitionStore.set(item.id, {
          ...item,
          isFulfilled: true,
          fulfilledAt: new Date(),
        });
      }
    }
  }
}

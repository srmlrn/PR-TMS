import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateDonationInput,
  Currency,
  Donation,
  DonationCampaign,
  DonationFrequency,
  PaginatedResponse,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { DonationCampaignEntity } from '../../database/entities/tenant/donation-campaign.entity';
import { DonationEntity } from '../../database/entities/tenant/donation.entity';
import { TenantDataService } from '../../database/tenant-data.service';

type DonationRecord = Donation & TenantEntity;
type CampaignRecord = DonationCampaign & TenantEntity;

export interface CampaignWithProgress extends DonationCampaign {
  progressPercent: number;
}

@Injectable()
export class DonationService
  extends BaseTenantService<DonationRecord>
  implements OnModuleInit
{
  protected store = new Map<string, DonationRecord>();
  private readonly campaignStore = new Map<string, CampaignRecord>();
  private readonly receiptCounters = new Map<string, number>();

  constructor(private readonly tenantData: TenantDataService) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedCampaigns('00000000-0000-0000-0000-000000000001');
    }
  }

  private seedCampaigns(tenantId: string): void {
    const hasCampaigns = [...this.campaignStore.values()].some(
      (c) => c.tenantId === tenantId,
    );
    if (hasCampaigns) {
      return;
    }

    this.createCampaign(tenantId, {
      name: 'Temple Renovation 2026',
      targetAmount: 100_000,
      raisedAmount: 72_000,
      currency: Currency.USD,
      isActive: true,
    });

    this.createCampaign(tenantId, {
      name: 'Annadanam Sponsorship',
      targetAmount: 10_000,
      raisedAmount: 4_500,
      currency: Currency.USD,
      isActive: true,
    });
  }

  private createCampaign(
    tenantId: string,
    data: Omit<CampaignRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): CampaignRecord {
    const now = new Date();
    const entity: CampaignRecord = {
      ...data,
      id: uuidv4(),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    this.campaignStore.set(entity.id, entity);
    return entity;
  }

  private ensureCampaignsSeeded(tenantId: string): void {
    const hasCampaigns = [...this.campaignStore.values()].some(
      (c) => c.tenantId === tenantId,
    );
    if (!hasCampaigns) {
      this.seedCampaigns(tenantId);
    }
  }

  private generateReceiptNumberSync(tenantId: string): string {
    const year = new Date().getFullYear();
    const counterKey = `${tenantId}:${year}`;
    const next = (this.receiptCounters.get(counterKey) ?? 0) + 1;
    this.receiptCounters.set(counterKey, next);

    const existingMax = this.scoped(tenantId)
      .map((d) => d.receiptNumber)
      .filter((r) => r.startsWith(`RCT-${year}-`))
      .map((r) => parseInt(r.split('-')[2] ?? '0', 10))
      .reduce((max, n) => Math.max(max, n), 0);

    const sequence = Math.max(next, existingMax + 1);
    this.receiptCounters.set(counterKey, sequence);
    return `RCT-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private async generateReceiptNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counterKey = `${tenantId}:${year}`;
    const next = (this.receiptCounters.get(counterKey) ?? 0) + 1;
    this.receiptCounters.set(counterKey, next);

    const repo = await this.tenantData.donations();
    const existing = await repo
      .createQueryBuilder('d')
      .where('d.receiptNumber LIKE :prefix', { prefix: `RCT-${year}-%` })
      .getMany();

    const existingMax = existing
      .map((d) => parseInt(d.receiptNumber.split('-')[2] ?? '0', 10))
      .reduce((max, n) => Math.max(max, n), 0);

    const sequence = Math.max(next, existingMax + 1);
    this.receiptCounters.set(counterKey, sequence);
    return `RCT-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private resolveTaxDoc(currency: Currency): {
    taxCompliant: boolean;
    taxDocType?: 'irs_501c3' | '80g' | 'cra';
  } {
    switch (currency) {
      case Currency.USD:
        return { taxCompliant: true, taxDocType: 'irs_501c3' };
      case Currency.INR:
        return { taxCompliant: true, taxDocType: '80g' };
      case Currency.CAD:
        return { taxCompliant: true, taxDocType: 'cra' };
      default:
        return { taxCompliant: false };
    }
  }

  private withProgress(campaign: CampaignRecord): CampaignWithProgress {
    const progressPercent =
      campaign.targetAmount > 0
        ? Math.min(
            100,
            Math.round((campaign.raisedAmount / campaign.targetAmount) * 100),
          )
        : 0;
    return { ...campaign, progressPercent };
  }

  async createDonation(tenantId: string, input: CreateDonationInput): Promise<DonationRecord> {
    const tax = this.resolveTaxDoc(input.currency);

    if (this.usePostgres) {
      if (input.campaignId) {
        const campaignRepo = await this.tenantData.campaigns();
        const campaign = await campaignRepo.findOne({ where: { id: input.campaignId } });
        if (!campaign) {
          throw new NotFoundException(`Campaign ${input.campaignId} not found`);
        }
      }

      const repo = await this.tenantData.donations();
      const entity = repo.create({
        devoteeId: input.devoteeId,
        amount: input.amount,
        currency: input.currency,
        purpose: input.purpose,
        frequency: input.frequency ?? DonationFrequency.ONE_TIME,
        receiptNumber: await this.generateReceiptNumber(tenantId),
        taxCompliant: tax.taxCompliant,
        campaignId: input.campaignId,
      });
      const saved = await repo.save(entity);

      if (input.campaignId) {
        const campaignRepo = await this.tenantData.campaigns();
        const campaign = await campaignRepo.findOneOrFail({
          where: { id: input.campaignId },
        });
        campaign.raisedAmount = Number(campaign.raisedAmount) + input.amount;
        await campaignRepo.save(campaign);
      }

      return this.toDonation(saved);
    }

    this.ensureCampaignsSeeded(tenantId);

    if (input.campaignId) {
      const campaign = this.findCampaignScoped(tenantId, input.campaignId);
      if (!campaign) {
        throw new NotFoundException(`Campaign ${input.campaignId} not found`);
      }
    }

    const donation = this.createEntity(tenantId, {
      devoteeId: input.devoteeId,
      amount: input.amount,
      currency: input.currency,
      purpose: input.purpose,
      frequency: input.frequency ?? DonationFrequency.ONE_TIME,
      receiptNumber: this.generateReceiptNumberSync(tenantId),
      taxCompliant: tax.taxCompliant,
      taxDocType: tax.taxDocType,
      campaignId: input.campaignId,
    });

    if (input.campaignId) {
      const campaign = this.findCampaignScoped(tenantId, input.campaignId);
      if (campaign) {
        campaign.raisedAmount += input.amount;
        campaign.updatedAt = new Date();
        this.campaignStore.set(campaign.id, campaign);
      }
    }

    return donation;
  }

  async findDonations(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<DonationRecord>> {
    if (this.usePostgres) {
      const repo = await this.tenantData.donations();
      const [rows, total] = await repo.findAndCount({
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        data: rows.map((r) => this.toDonation(r)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    const items = this.scoped(tenantId).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return this.paginate(items, page, limit);
  }

  async findCampaigns(tenantId: string): Promise<CampaignWithProgress[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.campaigns();
      const rows = await repo.find();
      return rows.map((r) => this.withProgress(this.toCampaign(r)));
    }

    this.ensureCampaignsSeeded(tenantId);
    return [...this.campaignStore.values()]
      .filter((c) => c.tenantId === tenantId)
      .map((c) => this.withProgress(c));
  }

  async findCampaignById(tenantId: string, id: string): Promise<CampaignWithProgress> {
    if (this.usePostgres) {
      const repo = await this.tenantData.campaigns();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Campaign ${id} not found`);
      }
      return this.withProgress(this.toCampaign(row));
    }

    this.ensureCampaignsSeeded(tenantId);
    const campaign = this.findCampaignScoped(tenantId, id);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return this.withProgress(campaign);
  }

  private toDonation(row: DonationEntity): DonationRecord {
    const tax = this.resolveTaxDoc(row.currency as Currency);
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      devoteeId: row.devoteeId,
      amount: Number(row.amount),
      currency: row.currency as Currency,
      purpose: row.purpose,
      frequency: row.frequency as DonationFrequency,
      receiptNumber: row.receiptNumber,
      taxCompliant: row.taxCompliant,
      taxDocType: tax.taxDocType,
      campaignId: row.campaignId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toCampaign(row: DonationCampaignEntity): CampaignRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      name: row.name,
      targetAmount: Number(row.targetAmount),
      raisedAmount: Number(row.raisedAmount),
      currency: row.currency as Currency,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private findCampaignScoped(
    tenantId: string,
    id: string,
  ): CampaignRecord | undefined {
    const campaign = this.campaignStore.get(id);
    return campaign?.tenantId === tenantId ? campaign : undefined;
  }
}

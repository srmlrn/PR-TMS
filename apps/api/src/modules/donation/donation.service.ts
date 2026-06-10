import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateDonationInput,
  Currency,
  Donation,
  DonationCampaign,
  DonationFrequency,
  PaginatedResponse,
  PaymentStatus,
  DevoteeTaxStatement,
  TaxReceipt,
} from '@tms/types';
import { DevoteeService } from '../devotee/devotee.service';
import { PaymentService } from '../payment/payment.service';
import { TenantSiteSettingsService } from '../settings/tenant-site-settings.service';
import { validateTaxId } from '../payment/tax-validation.util';
import { DonationBillingService } from './donation-billing.service';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { DonationCampaignEntity } from '../../database/entities/tenant/donation-campaign.entity';
import { DonationEntity } from '../../database/entities/tenant/donation.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import {
  formatReceiptNumber,
  nextReceiptSequence,
} from '../../common/utils/receipt-sequence.util';

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

  constructor(
    private readonly tenantData: TenantDataService,
    private readonly paymentService: PaymentService,
    private readonly billingService: DonationBillingService,
    private readonly devoteeService: DevoteeService,
    @Inject(forwardRef(() => TenantSiteSettingsService))
    private readonly siteSettings: TenantSiteSettingsService,
  ) {
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

  private async generateReceiptNumber(_tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RCT-${year}-`;
    const [donationRepo, bookingRepo] = await Promise.all([
      this.tenantData.donations(),
      this.tenantData.bookings(),
    ]);
    const [donations, bookings] = await Promise.all([
      donationRepo
        .createQueryBuilder('d')
        .select(['d.receiptNumber'])
        .where('d.receiptNumber LIKE :prefix', { prefix: `${prefix}%` })
        .getMany(),
      bookingRepo
        .createQueryBuilder('b')
        .select(['b.receiptNumber'])
        .where('b.receiptNumber LIKE :prefix', { prefix: `${prefix}%` })
        .getMany(),
    ]);
    const sequence = nextReceiptSequence(
      [...donations, ...bookings].map((r) => r.receiptNumber),
      year,
      0,
    );
    return formatReceiptNumber(year, sequence);
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
    if (!input.isInKind && input.amount <= 0) {
      throw new BadRequestException('amount must be positive for cash donations');
    }

    validateTaxId(input.currency, input.taxId);
    const tax = this.resolveTaxDoc(input.currency);

    let paymentStatus = PaymentStatus.PAID;
    if (!input.isInKind) {
      const paidSession = await this.paymentService.enforcePaidCheckout(
        tenantId,
        input.paymentSessionId,
        input.amount,
        input.currency,
      );
      if (paidSession) {
        paymentStatus = paidSession.status;
      }
    }

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
        taxId: input.taxId,
        paymentStatus,
        campaignId: input.campaignId,
        isAnonymous: input.isAnonymous ?? false,
        isInKind: input.isInKind ?? false,
        inKindDescription: input.inKindDescription,
      });
      const saved = await repo.save(entity);
      const donation = this.toDonation(saved);
      await this.billingService.createFromDonation(tenantId, donation, input);

      if (input.campaignId) {
        const campaignRepo = await this.tenantData.campaigns();
        const campaign = await campaignRepo.findOneOrFail({
          where: { id: input.campaignId },
        });
        campaign.raisedAmount = Number(campaign.raisedAmount) + input.amount;
        await campaignRepo.save(campaign);
      }

      return donation;
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
      taxId: input.taxId,
      paymentStatus,
      campaignId: input.campaignId,
      isAnonymous: input.isAnonymous,
      isInKind: input.isInKind,
      inKindDescription: input.inKindDescription,
    });

    await this.billingService.createFromDonation(tenantId, donation, input);

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

  /** POS checkout — payment verified once at session level; skip per-line amount check. */
  async createFromPosCheckout(
    tenantId: string,
    input: CreateDonationInput,
  ): Promise<DonationRecord> {
    if (input.amount <= 0) {
      throw new BadRequestException('amount must be positive');
    }

    validateTaxId(input.currency, input.taxId);
    const tax = this.resolveTaxDoc(input.currency);

    if (this.usePostgres) {
      const repo = await this.tenantData.donations();
      const entity = repo.create({
        devoteeId: input.devoteeId,
        amount: input.amount,
        currency: input.currency,
        purpose: input.purpose,
        frequency: input.frequency ?? DonationFrequency.ONE_TIME,
        receiptNumber: await this.generateReceiptNumber(tenantId),
        taxCompliant: tax.taxCompliant,
        taxId: input.taxId,
        paymentStatus: PaymentStatus.PAID,
        campaignId: input.campaignId,
        isAnonymous: input.isAnonymous ?? false,
        isInKind: false,
      });
      const saved = await repo.save(entity);
      const donation = this.toDonation(saved);
      await this.billingService.createFromDonation(tenantId, donation, input);
      return donation;
    }

    this.ensureCampaignsSeeded(tenantId);

    const donation = this.createEntity(tenantId, {
      devoteeId: input.devoteeId,
      amount: input.amount,
      currency: input.currency,
      purpose: input.purpose,
      frequency: input.frequency ?? DonationFrequency.ONE_TIME,
      receiptNumber: this.generateReceiptNumberSync(tenantId),
      taxCompliant: tax.taxCompliant,
      taxDocType: tax.taxDocType,
      taxId: input.taxId,
      paymentStatus: PaymentStatus.PAID,
      campaignId: input.campaignId,
      isAnonymous: input.isAnonymous,
    });

    await this.billingService.createFromDonation(tenantId, donation, input);
    return donation;
  }

  async findDonations(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: { devoteeId?: string },
  ): Promise<PaginatedResponse<DonationRecord>> {
    if (this.usePostgres) {
      const repo = await this.tenantData.donations();
      const qb = repo.createQueryBuilder('d');

      if (filters?.devoteeId) {
        qb.andWhere('d.devoteeId = :devoteeId', { devoteeId: filters.devoteeId });
      }

      qb.orderBy('d.createdAt', 'DESC');
      const total = await qb.getCount();
      const rows = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      return {
        data: rows.map((r) => this.toDonation(r)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    let items = this.scoped(tenantId);
    if (filters?.devoteeId) {
      items = items.filter((d) => d.devoteeId === filters.devoteeId);
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

  async findDonationById(tenantId: string, id: string): Promise<DonationRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.donations();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Donation ${id} not found`);
      }
      return this.toDonation(row);
    }

    const donation = this.findOneScoped(tenantId, id);
    if (!donation) {
      throw new NotFoundException(`Donation ${id} not found`);
    }
    return donation;
  }

  async getReceipt(tenantId: string, id: string): Promise<TaxReceipt> {
    const donation = await this.findDonationById(tenantId, id);
    const tax = this.resolveTaxDoc(donation.currency);
    const branding = await this.siteSettings.getBranding(tenantId);
    return {
      receiptNumber: donation.receiptNumber,
      amount: donation.amount,
      currency: donation.currency,
      taxDocType: tax.taxDocType,
      taxId: donation.taxId,
      devoteeId: donation.devoteeId,
      purpose: donation.purpose,
      issuedAt: donation.createdAt.toISOString(),
      templeName: branding.name,
    };
  }

  async getAnnualTaxStatement(
    tenantId: string,
    devoteeId: string,
    year?: number,
  ): Promise<DevoteeTaxStatement> {
    const taxYear = year ?? new Date().getFullYear();
    const devotee = await this.devoteeService.findOne(tenantId, devoteeId);
    const branding = await this.siteSettings.getBranding(tenantId);
    const currency = (branding.baseCurrency as Currency) ?? Currency.USD;
    const tax = this.resolveTaxDoc(currency);
    if (!tax.taxDocType) {
      throw new BadRequestException('Tax statements are not available for this temple currency.');
    }

    const { data: donations } = await this.findDonations(tenantId, 1, 500, { devoteeId });
    const yearDonations = donations.filter(
      (d) =>
        !d.isInKind &&
        d.paymentStatus === PaymentStatus.PAID &&
        new Date(d.createdAt).getFullYear() === taxYear,
    );

    let lines = yearDonations.map((d) => ({
      date: d.createdAt.toISOString().slice(0, 10),
      receiptNumber: d.receiptNumber,
      purpose: d.purpose,
      amount: d.amount,
      currency: d.currency,
    }));

    let totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);

    if (lines.length === 0 && devotee.ytdDonations?.amount && taxYear === new Date().getFullYear()) {
      totalAmount = devotee.ytdDonations.amount;
      lines = [
        {
          date: `${taxYear}-12-31`,
          receiptNumber: `YTD-${taxYear}`,
          purpose: 'Year-to-date charitable giving (summary)',
          amount: totalAmount,
          currency: devotee.ytdDonations.currency ?? currency,
        },
      ];
    }

    if (totalAmount <= 0) {
      throw new NotFoundException(`No tax-deductible donations found for ${taxYear}.`);
    }

    const devoteeName = [devotee.firstName, devotee.lastName].filter(Boolean).join(' ');

    return {
      statementNumber: `TAX-${taxYear}-${devoteeId.slice(-6).toUpperCase()}`,
      devoteeId,
      devoteeName,
      taxId: devotee.taxId,
      year: taxYear,
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: lines[0]?.currency ?? currency,
      taxDocType: tax.taxDocType,
      templeName: branding.name,
      templeAddress: branding.address,
      issuedAt: new Date().toISOString(),
      donations: lines,
    };
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
      taxId: row.taxId,
      paymentStatus: row.paymentStatus as PaymentStatus,
      campaignId: row.campaignId,
      isAnonymous: row.isAnonymous,
      isInKind: row.isInKind,
      inKindDescription: row.inKindDescription,
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

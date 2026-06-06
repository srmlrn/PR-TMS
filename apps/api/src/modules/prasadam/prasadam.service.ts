import {
  ConflictException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import {
  Currency,
  PrasadamPackageTier,
  PrasadamSlotAvailability,
  PrasadamSponsorship,
  PrasadamSponsorshipType,
  getTenantBranding,
} from '@tms/types';
import { v4 as uuidv4 } from 'uuid';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { PrasadamSponsorshipEntity } from '../../database/entities/tenant/prasadam-sponsorship.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreatePrasadamSponsorshipDto } from './dto/create-prasadam-sponsorship.dto';

type PrasadamSponsorshipRecord = PrasadamSponsorship & TenantEntity;

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

const PACKAGE_AMOUNTS: Record<PrasadamPackageTier, number> = {
  [PrasadamPackageTier.BASIC]: 51,
  [PrasadamPackageTier.SILVER]: 101,
  [PrasadamPackageTier.GOLD]: 151,
  [PrasadamPackageTier.PLATINUM]: 251,
  [PrasadamPackageTier.NRI_COURIER]: 201,
};

@Injectable()
export class PrasadamService
  extends BaseTenantService<PrasadamSponsorshipRecord>
  implements OnModuleInit
{
  protected store = new Map<string, PrasadamSponsorshipRecord>();

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

  async getAvailability(
    tenantId: string,
    query: AvailabilityQueryDto,
  ): Promise<PrasadamSlotAvailability[]> {
    const [year, month] = query.month.split('-').map(Number);
    if (!year || !month) {
      return [];
    }

    const type = query.type ?? PrasadamSponsorshipType.DAILY;
    const deity = query.deity ?? getTenantBranding(tenantId).deity;
    const daysInMonth = new Date(year, month, 0).getDate();
    const slots: PrasadamSlotAvailability[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (query.date && query.date !== date) {
        continue;
      }

      const booking = await this.findBooking(tenantId, date, type, deity);
      slots.push({
        date,
        type,
        deity,
        isAvailable: !booking,
        sponsoredBy: booking?.sankalpa.sponsorName,
      });
    }

    return slots;
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    type?: PrasadamSponsorshipType,
    scheduledDate?: string,
    deity?: string,
  ) {
    if (this.usePostgres) {
      const repo = await this.tenantData.prasadamSponsorships();
      const qb = repo.createQueryBuilder('p');
      if (type) {
        qb.andWhere('p.type = :type', { type });
      }
      if (scheduledDate) {
        qb.andWhere('p.scheduledDate = :scheduledDate', { scheduledDate });
      }
      if (deity) {
        qb.andWhere('p.deity = :deity', { deity });
      }
      qb.orderBy('p.scheduledDate', 'DESC');
      const total = await qb.getCount();
      const rows = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
      return {
        data: rows.map((r) => this.toPrasadamSponsorship(r)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    let items = this.scoped(tenantId);
    if (type) {
      items = items.filter((s) => s.type === type);
    }
    if (scheduledDate) {
      items = items.filter(
        (s) => this.formatDate(s.scheduledDate) === scheduledDate,
      );
    }
    if (deity) {
      items = items.filter((s) => s.deity === deity);
    }
    items.sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
    return this.paginate(items, page, limit);
  }

  async createSponsorship(
    tenantId: string,
    dto: CreatePrasadamSponsorshipDto,
  ): Promise<PrasadamSponsorshipRecord> {
    const scheduledDate = new Date(dto.scheduledDate);
    const dateKey = this.formatDate(scheduledDate);

    const existing = await this.findBooking(tenantId, dateKey, dto.type, dto.deity);
    if (existing) {
      throw new ConflictException(
        `Slot already booked for ${dateKey} · ${dto.type} · ${dto.deity}`,
      );
    }

    const currency = dto.currency ?? Currency.USD;
    const amount = PACKAGE_AMOUNTS[dto.packageTier];
    const kitchenOrderId = `KO-${uuidv4().slice(0, 8).toUpperCase()}`;
    const receiptNumber = `PR-${Date.now().toString(36).toUpperCase()}`;

    if (this.usePostgres) {
      const repo = await this.tenantData.prasadamSponsorships();
      const entity = repo.create({
        type: dto.type,
        packageTier: dto.packageTier,
        devoteeId: dto.devoteeId,
        scheduledDate: dateKey,
        deity: dto.deity,
        amount,
        currency,
        sankalpa: dto.sankalpa as unknown as Record<string, string>,
        receiptNumber,
        status: 'kitchen_pending',
      });
      const saved = await repo.save(entity);
      const record = this.toPrasadamSponsorship(saved);
      return { ...record, kitchenOrderId };
    }

    return this.createEntity(tenantId, {
      type: dto.type,
      packageTier: dto.packageTier,
      sponsorId: dto.sponsorId,
      devoteeId: dto.devoteeId,
      scheduledDate,
      deity: dto.deity,
      amount,
      currency,
      sankalpa: dto.sankalpa,
      receiptNumber,
      kitchenOrderId,
      courierTrackingId: dto.courierAddress
        ? `TRK-${uuidv4().slice(0, 10).toUpperCase()}`
        : undefined,
      status: 'kitchen_pending',
    });
  }

  private toPrasadamSponsorship(row: PrasadamSponsorshipEntity): PrasadamSponsorshipRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      type: row.type as PrasadamSponsorshipType,
      packageTier: row.packageTier as PrasadamPackageTier,
      devoteeId: row.devoteeId,
      scheduledDate: new Date(row.scheduledDate),
      deity: row.deity,
      amount: Number(row.amount),
      currency: row.currency as Currency,
      sankalpa: row.sankalpa as unknown as PrasadamSponsorship['sankalpa'],
      receiptNumber: row.receiptNumber,
      status: row.status as PrasadamSponsorship['status'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async findBooking(
    tenantId: string,
    date: string,
    type: PrasadamSponsorshipType,
    deity: string,
  ): Promise<PrasadamSponsorshipRecord | undefined> {
    if (this.usePostgres) {
      const repo = await this.tenantData.prasadamSponsorships();
      const row = await repo.findOne({
        where: { scheduledDate: date, type, deity },
      });
      if (!row || row.status === 'distributed') {
        return undefined;
      }
      return this.toPrasadamSponsorship(row);
    }

    return this.scoped(tenantId).find(
      (s) =>
        this.formatDate(s.scheduledDate) === date &&
        s.type === type &&
        s.deity === deity &&
        s.status !== 'distributed',
    );
  }

  private formatDate(value: Date | string): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toISOString().slice(0, 10);
  }

  private seedDemoData(): void {
    if (this.scoped(DEMO_TENANT).length > 0) {
      return;
    }

    const defaultDeity = getTenantBranding(DEMO_TENANT).deity;

    this.createEntity(DEMO_TENANT, {
      type: PrasadamSponsorshipType.DAILY,
      packageTier: PrasadamPackageTier.GOLD,
      devoteeId: 'devotee-demo-001',
      scheduledDate: new Date('2026-06-06'),
      deity: defaultDeity,
      amount: PACKAGE_AMOUNTS[PrasadamPackageTier.GOLD],
      currency: Currency.USD,
      sankalpa: {
        sponsorName: 'Rajan Krishnamurthy',
        gotram: 'Bharadwaja',
        occasion: 'Birthday',
      },
      receiptNumber: 'PR-DEMO001',
      kitchenOrderId: 'KO-DEMO001',
      status: 'prepared',
    });

    this.createEntity(DEMO_TENANT, {
      type: PrasadamSponsorshipType.DAILY,
      packageTier: PrasadamPackageTier.GOLD,
      devoteeId: 'devotee-demo-002',
      scheduledDate: new Date('2026-06-03'),
      deity: defaultDeity,
      amount: PACKAGE_AMOUNTS[PrasadamPackageTier.GOLD],
      currency: Currency.USD,
      sankalpa: {
        sponsorName: 'Priya Nair',
        occasion: 'Anniversary',
      },
      receiptNumber: 'PR-DEMO002',
      kitchenOrderId: 'KO-DEMO002',
      status: 'distributed',
    });
  }
}

import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Currency, SevaService } from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { SevaServiceEntity } from '../../database/entities/tenant/seva-service.entity';
import { TenantDataService } from '../../database/tenant-data.service';

type SevaServiceRecord = SevaService & TenantEntity;

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

const SLOT_WINDOW = {
  startHour: 9,
  endHour: 17,
  intervalMinutes: 30,
};

@Injectable()
export class SevaCatalogService
  extends BaseTenantService<SevaServiceRecord>
  implements OnModuleInit
{
  protected store = new Map<string, SevaServiceRecord>();

  constructor(private readonly tenantData: TenantDataService) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedServices(DEMO_TENANT);
    }
  }

  async findAll(tenantId: string): Promise<SevaServiceRecord[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.sevaServices();
      const rows = await repo.find({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
      return rows.map((r) => this.toSevaService(r));
    }

    this.ensureSeeded(tenantId);
    return this.scoped(tenantId)
      .filter((s) => s.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async findOne(tenantId: string, id: string): Promise<SevaServiceRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.sevaServices();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Service ${id} not found`);
      }
      return this.toSevaService(row);
    }

    this.ensureSeeded(tenantId);
    const service = this.findOneScoped(tenantId, id);
    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }
    return service;
  }

  async getSlotsForDate(
    tenantId: string,
    serviceId: string,
    date: string,
    bookedRanges: Array<{ start: Date; end: Date }>,
  ): Promise<TimeSlot[]> {
    const service = await this.findOne(tenantId, serviceId);
    const dayStart = this.parseDateOnly(date);

    const slots: TimeSlot[] = [];
    const intervalMs = SLOT_WINDOW.intervalMinutes * 60_000;
    const durationMs = service.durationMinutes * 60_000;

    for (
      let cursor = dayStart.getTime() + SLOT_WINDOW.startHour * 3_600_000;
      cursor + durationMs <= dayStart.getTime() + SLOT_WINDOW.endHour * 3_600_000;
      cursor += intervalMs
    ) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor + durationMs);
      const available = !bookedRanges.some((range) =>
        this.rangesOverlap(slotStart, slotEnd, range.start, range.end),
      );

      slots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        available,
      });
    }

    return slots;
  }

  private toSevaService(row: SevaServiceEntity): SevaServiceRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      name: row.name,
      deity: row.deity,
      description: row.description,
      price: Number(row.price),
      currency: row.currency as Currency,
      durationMinutes: row.durationMinutes,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private rangesOverlap(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date,
  ): boolean {
    return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
  }

  private parseDateOnly(date: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private ensureSeeded(tenantId: string): void {
    if (this.scoped(tenantId).length === 0) {
      this.seedServices(tenantId);
    }
  }

  private seedServices(tenantId: string): void {
    if (this.scoped(tenantId).length > 0) {
      return;
    }

    const now = new Date();
    const services: Array<Omit<SevaServiceRecord, 'createdAt' | 'updatedAt'>> = [
      {
        id: 'svc-archana',
        tenantId,
        name: 'Archana',
        deity: 'Lord Venkateswara',
        description: 'Daily archana with sankalpa name, gotram, and nakshatra',
        price: 25,
        currency: Currency.USD,
        durationMinutes: 30,
        isActive: true,
      },
      {
        id: 'svc-abhishekam',
        tenantId,
        name: 'Abhishekam',
        deity: 'Lord Venkateswara',
        description: 'Special abhishekam ritual bathing of the deity',
        price: 101,
        currency: Currency.USD,
        durationMinutes: 60,
        isActive: true,
      },
      {
        id: 'svc-homam',
        tenantId,
        name: 'Homam',
        deity: 'Lord Venkateswara',
        description: 'Sacred fire ritual with priest-led homam',
        price: 251,
        currency: Currency.USD,
        durationMinutes: 90,
        isActive: true,
      },
      {
        id: 'svc-vip-darshan',
        tenantId,
        name: 'VIP Darshan',
        deity: 'Lord Venkateswara',
        description: 'Priority darshan with shorter queue wait',
        price: 51,
        currency: Currency.USD,
        durationMinutes: 15,
        isActive: true,
      },
    ];

    for (const service of services) {
      this.store.set(service.id, {
        ...service,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

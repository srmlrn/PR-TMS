import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  CreateSevaServiceInput,
  Currency,
  DEMO_TENANT_IDS,
  getTenantBranding,
  GANESHA_TEMPLE_ID,
  SevaService,
  UpdateSevaServiceInput,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { SevaServiceEntity } from '../../database/entities/tenant/seva-service.entity';
import { TenantDataService } from '../../database/tenant-data.service';
type SevaServiceRecord = SevaService & TenantEntity;

export interface SlotWindow {
  startHour: number;
  endHour: number;
  intervalMinutes: number;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

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
      for (const tenantId of DEMO_TENANT_IDS) {
        this.syncDemoServices(tenantId);
      }
    }
  }

  async findAll(tenantId: string): Promise<SevaServiceRecord[]> {
    const all = await this.findAllAdmin(tenantId);
    return all.filter((s) => s.isActive);
  }

  async findAllAdmin(tenantId: string): Promise<SevaServiceRecord[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.sevaServices();
      const rows = await repo.find({ order: { name: 'ASC' } });
      return rows.map((r) => this.toSevaService(r));
    }

    this.ensureSeeded(tenantId);
    return this.scoped(tenantId).sort((a, b) => a.name.localeCompare(b.name));
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

  async create(tenantId: string, input: CreateSevaServiceInput): Promise<SevaServiceRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.sevaServices();
      const row = await repo.save(
        repo.create({
          name: input.name.trim(),
          deity: input.deity.trim(),
          description: input.description?.trim(),
          price: input.price,
          priceOffSite: input.priceOffSite,
          currency: input.currency ?? Currency.USD,
          durationMinutes: input.durationMinutes ?? 30,
          isActive: input.isActive ?? true,
        }),
      );
      return this.toSevaService(row);
    }

    this.ensureSeeded(tenantId);
    return this.createEntity(tenantId, {
      name: input.name.trim(),
      deity: input.deity.trim(),
      description: input.description?.trim(),
      price: input.price,
      priceOffSite: input.priceOffSite,
      currency: input.currency ?? Currency.USD,
      durationMinutes: input.durationMinutes ?? 30,
      isActive: input.isActive ?? true,
    });
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateSevaServiceInput,
  ): Promise<SevaServiceRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.sevaServices();
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Service ${id} not found`);
      }
      const row = await repo.save({
        ...existing,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.deity !== undefined ? { deity: input.deity.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description.trim() || undefined }
          : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.priceOffSite !== undefined
          ? { priceOffSite: input.priceOffSite ?? undefined }
          : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.durationMinutes !== undefined
          ? { durationMinutes: input.durationMinutes }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      });
      return this.toSevaService(row);
    }

    this.ensureSeeded(tenantId);
    return this.updateEntity(tenantId, id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.deity !== undefined ? { deity: input.deity.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() || undefined }
        : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.priceOffSite !== undefined
        ? { priceOffSite: input.priceOffSite ?? undefined }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.durationMinutes !== undefined
        ? { durationMinutes: input.durationMinutes }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
  }

  async getSlotsForDate(
    tenantId: string,
    serviceId: string,
    date: string,
    bookedRanges: Array<{ start: Date; end: Date }>,
    slotWindow: SlotWindow = { startHour: 9, endHour: 17, intervalMinutes: 30 },
  ): Promise<TimeSlot[]> {
    const service = await this.findOne(tenantId, serviceId);
    const dayStart = this.parseDateOnly(date);

    const slots: TimeSlot[] = [];
    const intervalMs = slotWindow.intervalMinutes * 60_000;
    const durationMs = service.durationMinutes * 60_000;

    for (
      let cursor = dayStart.getTime() + slotWindow.startHour * 3_600_000;
      cursor + durationMs <= dayStart.getTime() + slotWindow.endHour * 3_600_000;
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
      priceOffSite: row.priceOffSite != null ? Number(row.priceOffSite) : undefined,
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
      this.syncDemoServices(tenantId);
    }
  }

  /** Upsert canonical demo catalog (on-site + off-site prices). */
  private syncDemoServices(tenantId: string): void {
    const now = new Date();
    const deity = getTenantBranding(tenantId).deity;
    const prefix = tenantId === GANESHA_TEMPLE_ID ? 'sgt-' : '';
    const services: Array<Omit<SevaServiceRecord, 'createdAt' | 'updatedAt'>> = [
      {
        id: `${prefix}svc-archana`,
        tenantId,
        name: 'Archana',
        deity,
        description: 'Daily archana with sankalpa name, gotram, and nakshatra',
        price: 25,
        priceOffSite: 51,
        currency: Currency.USD,
        durationMinutes: 30,
        isActive: true,
      },
      {
        id: `${prefix}svc-abhishekam`,
        tenantId,
        name: 'Abhishekam',
        deity,
        description: 'Special abhishekam ritual bathing of the deity',
        price: 101,
        priceOffSite: 151,
        currency: Currency.USD,
        durationMinutes: 60,
        isActive: true,
      },
      {
        id: `${prefix}svc-homam`,
        tenantId,
        name: 'Homam',
        deity,
        description: 'Sacred fire ritual with priest-led homam',
        price: 251,
        priceOffSite: 401,
        currency: Currency.USD,
        durationMinutes: 90,
        isActive: true,
      },
      {
        id: `${prefix}svc-vip-darshan`,
        tenantId,
        name: 'VIP Darshan',
        deity,
        description: 'Priority darshan with shorter queue wait (on-site only)',
        price: 51,
        currency: Currency.USD,
        durationMinutes: 15,
        isActive: true,
      },
    ];

    for (const service of services) {
      const existing = this.store.get(service.id);
      this.store.set(service.id, {
        ...service,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    }
  }
}

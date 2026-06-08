import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  getTenantBranding,
  mergeTenantBranding,
  TenantBranding,
  TenantBrandingOverrides,
  TenantBrandingSettingsPublic,
  TenantScheduleSettings,
  UpdateTenantBrandingInput,
  UpdateTenantScheduleInput,
} from '@tms/types';
import { TenantSiteSettingsEntity } from '../../database/entities/control/tenant-site-settings.entity';

export interface TenantSiteSettingsRecord {
  tenantId: string;
  name?: string;
  subtitle?: string;
  icon?: string;
  logoSrc?: string;
  logoBg?: string;
  deity?: string;
  location?: string;
  address?: string;
  displayAnnouncements?: string[];
  openHour: number;
  closeHour: number;
  slotIntervalMinutes: number;
  updatedAt: Date;
}

const DEFAULT_SCHEDULE = {
  openHour: 9,
  closeHour: 17,
  slotIntervalMinutes: 30,
};

const memoryStore = new Map<string, TenantSiteSettingsRecord>();

@Injectable()
export class TenantSiteSettingsService {
  private readonly logger = new Logger(TenantSiteSettingsService.name);

  constructor(
    @Optional()
    @InjectRepository(TenantSiteSettingsEntity)
    private readonly repo: Repository<TenantSiteSettingsEntity> | undefined,
  ) {}

  private get usePostgres(): boolean {
    return process.env.STORAGE_MODE === 'postgres';
  }

  async getBranding(tenantId: string): Promise<TenantBranding> {
    const record = await this.loadRecord(tenantId);
    return mergeTenantBranding(getTenantBranding(tenantId), this.toOverrides(record));
  }

  async getBrandingSettings(tenantId: string): Promise<TenantBrandingSettingsPublic> {
    const record = await this.loadRecord(tenantId);
    const overrides = this.toOverrides(record);
    return {
      tenantId,
      overrides,
      branding: mergeTenantBranding(getTenantBranding(tenantId), overrides),
      updatedAt: record?.updatedAt.toISOString(),
    };
  }

  async updateBranding(
    tenantId: string,
    input: UpdateTenantBrandingInput,
  ): Promise<TenantBrandingSettingsPublic> {
    const existing = (await this.loadRecord(tenantId)) ?? this.emptyRecord(tenantId);
    const updated: TenantSiteSettingsRecord = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() || undefined : existing.name,
      subtitle:
        input.subtitle !== undefined ? input.subtitle.trim() || undefined : existing.subtitle,
      icon: input.icon !== undefined ? input.icon.trim() || undefined : existing.icon,
      logoSrc:
        input.logoSrc !== undefined ? input.logoSrc.trim() || undefined : existing.logoSrc,
      logoBg: input.logoBg !== undefined ? input.logoBg.trim() || undefined : existing.logoBg,
      deity: input.deity !== undefined ? input.deity.trim() || undefined : existing.deity,
      location:
        input.location !== undefined ? input.location.trim() || undefined : existing.location,
      address: input.address !== undefined ? input.address.trim() || undefined : existing.address,
      displayAnnouncements:
        input.displayAnnouncements !== undefined
          ? input.displayAnnouncements
          : existing.displayAnnouncements,
      updatedAt: new Date(),
    };

    await this.saveRecord(updated);
    this.logger.log(`Updated branding for tenant ${tenantId}`);
    return this.getBrandingSettings(tenantId);
  }

  async getScheduleSettings(tenantId: string): Promise<TenantScheduleSettings> {
    const record = await this.loadRecord(tenantId);
    return this.toSchedulePublic(tenantId, record);
  }

  async updateScheduleSettings(
    tenantId: string,
    input: UpdateTenantScheduleInput,
  ): Promise<TenantScheduleSettings> {
    const existing = (await this.loadRecord(tenantId)) ?? this.emptyRecord(tenantId);
    const openHour = input.openHour ?? existing.openHour;
    const closeHour = input.closeHour ?? existing.closeHour;
    const slotIntervalMinutes = input.slotIntervalMinutes ?? existing.slotIntervalMinutes;

    this.validateSchedule(openHour, closeHour, slotIntervalMinutes);

    const updated: TenantSiteSettingsRecord = {
      ...existing,
      openHour,
      closeHour,
      slotIntervalMinutes,
      updatedAt: new Date(),
    };

    await this.saveRecord(updated);
    this.logger.log(`Updated schedule for tenant ${tenantId}`);
    return this.toSchedulePublic(tenantId, updated);
  }

  async getSlotWindow(tenantId: string): Promise<{
    startHour: number;
    endHour: number;
    intervalMinutes: number;
  }> {
    const record = await this.loadRecord(tenantId);
    return {
      startHour: record?.openHour ?? DEFAULT_SCHEDULE.openHour,
      endHour: record?.closeHour ?? DEFAULT_SCHEDULE.closeHour,
      intervalMinutes: record?.slotIntervalMinutes ?? DEFAULT_SCHEDULE.slotIntervalMinutes,
    };
  }

  private validateSchedule(
    openHour: number,
    closeHour: number,
    slotIntervalMinutes: number,
  ): void {
    if (openHour < 0 || openHour > 23 || closeHour < 1 || closeHour > 24) {
      throw new BadRequestException('Hours must be between 0 and 24');
    }
    if (closeHour <= openHour) {
      throw new BadRequestException('Close hour must be after open hour');
    }
    if (![15, 30, 45, 60].includes(slotIntervalMinutes)) {
      throw new BadRequestException('Slot interval must be 15, 30, 45, or 60 minutes');
    }
  }

  private toOverrides(record?: TenantSiteSettingsRecord): TenantBrandingOverrides {
    if (!record) {
      return {};
    }
    return {
      ...(record.name !== undefined ? { name: record.name } : {}),
      ...(record.subtitle !== undefined ? { subtitle: record.subtitle } : {}),
      ...(record.icon !== undefined ? { icon: record.icon } : {}),
      ...(record.logoSrc !== undefined ? { logoSrc: record.logoSrc } : {}),
      ...(record.logoBg !== undefined ? { logoBg: record.logoBg } : {}),
      ...(record.deity !== undefined ? { deity: record.deity } : {}),
      ...(record.location !== undefined ? { location: record.location } : {}),
      ...(record.address !== undefined ? { address: record.address } : {}),
      ...(record.displayAnnouncements !== undefined
        ? { displayAnnouncements: record.displayAnnouncements }
        : {}),
    };
  }

  private toSchedulePublic(
    tenantId: string,
    record?: TenantSiteSettingsRecord,
  ): TenantScheduleSettings {
    return {
      tenantId,
      openHour: record?.openHour ?? DEFAULT_SCHEDULE.openHour,
      closeHour: record?.closeHour ?? DEFAULT_SCHEDULE.closeHour,
      slotIntervalMinutes: record?.slotIntervalMinutes ?? DEFAULT_SCHEDULE.slotIntervalMinutes,
      updatedAt: record?.updatedAt.toISOString(),
    };
  }

  private async loadRecord(tenantId: string): Promise<TenantSiteSettingsRecord | undefined> {
    if (!this.usePostgres) {
      return memoryStore.get(tenantId);
    }

    const row = await this.repo!.findOne({ where: { tenantId } });
    return row ? this.fromEntity(row) : undefined;
  }

  private async saveRecord(record: TenantSiteSettingsRecord): Promise<void> {
    if (!this.usePostgres) {
      memoryStore.set(record.tenantId, record);
      return;
    }

    const existing = await this.repo!.findOne({ where: { tenantId: record.tenantId } });
    if (existing) {
      await this.repo!.save({
        ...existing,
        name: record.name,
        subtitle: record.subtitle,
        icon: record.icon,
        logoSrc: record.logoSrc,
        logoBg: record.logoBg,
        deity: record.deity,
        location: record.location,
        address: record.address,
        displayAnnouncements: record.displayAnnouncements,
        openHour: record.openHour,
        closeHour: record.closeHour,
        slotIntervalMinutes: record.slotIntervalMinutes,
      });
      return;
    }

    await this.repo!.save({
      tenantId: record.tenantId,
      name: record.name,
      subtitle: record.subtitle,
      icon: record.icon,
      logoSrc: record.logoSrc,
      logoBg: record.logoBg,
      deity: record.deity,
      location: record.location,
      address: record.address,
      displayAnnouncements: record.displayAnnouncements,
      openHour: record.openHour,
      closeHour: record.closeHour,
      slotIntervalMinutes: record.slotIntervalMinutes,
    });
  }

  private emptyRecord(tenantId: string): TenantSiteSettingsRecord {
    return {
      tenantId,
      ...DEFAULT_SCHEDULE,
      updatedAt: new Date(),
    };
  }

  private fromEntity(row: TenantSiteSettingsEntity): TenantSiteSettingsRecord {
    return {
      tenantId: row.tenantId,
      name: row.name,
      subtitle: row.subtitle,
      icon: row.icon,
      logoSrc: row.logoSrc,
      logoBg: row.logoBg,
      deity: row.deity,
      location: row.location,
      address: row.address,
      displayAnnouncements: row.displayAnnouncements,
      openHour: row.openHour,
      closeHour: row.closeHour,
      slotIntervalMinutes: row.slotIntervalMinutes,
      updatedAt: row.updatedAt,
    };
  }
}

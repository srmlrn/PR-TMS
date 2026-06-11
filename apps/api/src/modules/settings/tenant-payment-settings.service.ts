import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentSettingsSource,
  PaymentTestCapabilities,
  ResolvedStripeConfig,
  SECRET_FIELD_MASK,
  TenantPaymentSettingsPublic,
  TenantPaymentSettingsRecord,
  UpdateTenantPaymentSettingsInput,
} from '@tms/types';
import { TenantPaymentSettingsEntity } from '../../database/entities/control/tenant-payment-settings.entity';
import { isRazorpayLive, razorpayWebhookSecret, stripeWebhookSecret } from '../payment/payment-config';

export { SECRET_FIELD_MASK };

const memoryStore = new Map<string, TenantPaymentSettingsRecord>();

@Injectable()
export class TenantPaymentSettingsService {
  private readonly logger = new Logger(TenantPaymentSettingsService.name);

  constructor(
    @Optional()
    @InjectRepository(TenantPaymentSettingsEntity)
    private readonly repo: Repository<TenantPaymentSettingsEntity> | undefined,
  ) {}

  private get usePostgres(): boolean {
    return process.env.STORAGE_MODE === 'postgres';
  }

  async getPublicSettings(tenantId: string): Promise<TenantPaymentSettingsPublic> {
    const record = await this.loadRecord(tenantId);
    const resolved = this.resolveStripeConfig(record);
    return this.toPublic(tenantId, record, resolved.source);
  }

  async updateSettings(
    tenantId: string,
    input: UpdateTenantPaymentSettingsInput,
  ): Promise<TenantPaymentSettingsPublic> {
    const existing = (await this.loadRecord(tenantId)) ?? this.emptyRecord(tenantId);
    const stripe = input.stripe;

    const updated: TenantPaymentSettingsRecord = {
      ...existing,
      stripeEnabled: stripe?.enabled ?? existing.stripeEnabled,
      stripeMode: stripe?.mode ?? existing.stripeMode,
      stripePublishableKey:
        stripe?.publishableKey !== undefined
          ? stripe.publishableKey.trim() || undefined
          : existing.stripePublishableKey,
      stripeSecretKey: this.mergeSecretField(stripe?.secretKey, existing.stripeSecretKey),
      stripeWebhookSecret: this.mergeSecretField(
        stripe?.webhookSecret,
        existing.stripeWebhookSecret,
      ),
      updatedAt: new Date(),
    };

    await this.saveRecord(updated);

    this.logger.log(`Updated payment settings for tenant ${tenantId}`);

    const resolved = this.resolveStripeConfig(updated);
    return this.toPublic(tenantId, updated, resolved.source);
  }

  resolveStripeConfig(record?: TenantPaymentSettingsRecord): ResolvedStripeConfig {
    const envSecret = process.env.STRIPE_SECRET_KEY?.trim();
    const envPublishable = process.env.STRIPE_PUBLISHABLE_KEY?.trim();
    const envWebhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (record?.stripeSecretKey?.trim()) {
      return {
        enabled: record.stripeEnabled,
        mode: record.stripeMode,
        publishableKey: record.stripePublishableKey?.trim() || undefined,
        secretKey: record.stripeSecretKey.trim(),
        webhookSecret: record.stripeWebhookSecret?.trim() || undefined,
        source: 'tenant',
      };
    }

    // Platform env keys are a single-tenant dev fallback only — never shared across temples in postgres mode.
    if (!this.usePostgres && envSecret) {
      return {
        enabled: true,
        mode: envSecret.startsWith('sk_live_') ? 'live' : 'test',
        publishableKey: envPublishable || undefined,
        secretKey: envSecret,
        webhookSecret: envWebhook || undefined,
        source: 'env',
      };
    }

    return {
      enabled: false,
      mode: 'test',
      source: 'none',
    };
  }

  async resolveStripeConfigForTenant(tenantId: string): Promise<ResolvedStripeConfig> {
    const record = await this.loadRecord(tenantId);
    return this.resolveStripeConfig(record);
  }

  isStripeLiveForTenant(config: ResolvedStripeConfig): boolean {
    return Boolean(config.enabled && config.secretKey?.trim());
  }

  private mergeSecretField(
    incoming: string | undefined,
    existing: string | undefined,
  ): string | undefined {
    if (incoming === undefined) {
      return existing;
    }
    const trimmed = incoming.trim();
    if (!trimmed || trimmed === SECRET_FIELD_MASK) {
      return existing;
    }
    return trimmed;
  }

  private async loadRecord(tenantId: string): Promise<TenantPaymentSettingsRecord | undefined> {
    if (!this.usePostgres) {
      return memoryStore.get(tenantId);
    }

    const row = await this.repo!.findOne({ where: { tenantId } });
    return row ? this.fromEntity(row) : undefined;
  }

  private async saveRecord(record: TenantPaymentSettingsRecord): Promise<void> {
    if (!this.usePostgres) {
      memoryStore.set(record.tenantId, record);
      return;
    }

    const existing = await this.repo!.findOne({ where: { tenantId: record.tenantId } });
    if (existing) {
      await this.repo!.save({
        ...existing,
        stripeEnabled: record.stripeEnabled,
        stripeMode: record.stripeMode,
        stripePublishableKey: record.stripePublishableKey,
        stripeSecretKey: record.stripeSecretKey,
        stripeWebhookSecret: record.stripeWebhookSecret,
      });
      return;
    }

    await this.repo!.save({
      tenantId: record.tenantId,
      stripeEnabled: record.stripeEnabled,
      stripeMode: record.stripeMode,
      stripePublishableKey: record.stripePublishableKey,
      stripeSecretKey: record.stripeSecretKey,
      stripeWebhookSecret: record.stripeWebhookSecret,
    });
  }

  private emptyRecord(tenantId: string): TenantPaymentSettingsRecord {
    return {
      tenantId,
      stripeEnabled: false,
      stripeMode: 'test',
      updatedAt: new Date(),
    };
  }

  private fromEntity(row: TenantPaymentSettingsEntity): TenantPaymentSettingsRecord {
    return {
      tenantId: row.tenantId,
      stripeEnabled: row.stripeEnabled,
      stripeMode: row.stripeMode,
      stripePublishableKey: row.stripePublishableKey,
      stripeSecretKey: row.stripeSecretKey,
      stripeWebhookSecret: row.stripeWebhookSecret,
      updatedAt: row.updatedAt,
    };
  }

  private toPublic(
    tenantId: string,
    record: TenantPaymentSettingsRecord | undefined,
    source: PaymentSettingsSource,
  ): TenantPaymentSettingsPublic {
    const resolved = this.resolveStripeConfig(record);
    return {
      tenantId,
      stripe: {
        enabled: resolved.enabled,
        mode: resolved.mode,
        publishableKey: resolved.publishableKey,
        hasSecretKey: Boolean(resolved.secretKey),
        hasWebhookSecret: Boolean(resolved.webhookSecret),
      },
      source,
      testCapabilities: this.buildTestCapabilities(resolved),
      updatedAt: record?.updatedAt.toISOString(),
    };
  }

  private buildTestCapabilities(resolved: ResolvedStripeConfig): PaymentTestCapabilities {
    return {
      stripeLive: this.isStripeLiveForTenant(resolved),
      razorpayLive: isRazorpayLive(),
      applePayDomainConfigured: Boolean(
        process.env.APPLE_PAY_DOMAIN_ASSOCIATION?.trim() ||
          (process.env.WEB_PAY_ORIGIN?.startsWith('https://') &&
            this.isStripeLiveForTenant(resolved)),
      ),
      demoUpiVpa: process.env.DEMO_UPI_VPA?.trim() || 'temple.demo@upi',
      webPayOrigin:
        process.env.WEB_PAY_ORIGIN?.trim() ||
        process.env.CORS_ORIGIN?.trim() ||
        'http://localhost:3001',
      stripeWebhookConfigured: Boolean(resolved.webhookSecret || stripeWebhookSecret()),
      razorpayWebhookConfigured: Boolean(razorpayWebhookSecret()),
    };
  }
}

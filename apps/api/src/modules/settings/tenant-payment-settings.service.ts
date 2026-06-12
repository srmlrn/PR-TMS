import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentSettingsSource,
  PaymentTestCapabilities,
  ResolvedPayPalConfig,
  ResolvedStripeConfig,
  ResolvedStripeTerminalConfig,
  SECRET_FIELD_MASK,
  TenantPaymentSettingsPublic,
  TenantPaymentSettingsRecord,
  UpdateTenantPaymentSettingsInput,
} from '@tms/types';
import { TenantPaymentSettingsEntity } from '../../database/entities/control/tenant-payment-settings.entity';
import {
  isPayPalLive,
  isRazorpayLive,
  paypalWebhookSecret,
  razorpayWebhookSecret,
  stripeWebhookSecret,
} from '../payment/payment-config';

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
    const stripeResolved = this.resolveStripeConfig(record);
    const paypalResolved = this.resolvePayPalConfig(record);
    return this.toPublic(tenantId, record, stripeResolved.source, paypalResolved.source);
  }

  async updateSettings(
    tenantId: string,
    input: UpdateTenantPaymentSettingsInput,
  ): Promise<TenantPaymentSettingsPublic> {
    const existing = (await this.loadRecord(tenantId)) ?? this.emptyRecord(tenantId);
    const stripe = input.stripe;
    const paypal = input.paypal;
    const terminal = input.terminal;

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
      paypalEnabled: paypal?.enabled ?? existing.paypalEnabled,
      paypalMode: paypal?.mode ?? existing.paypalMode,
      paypalClientId:
        paypal?.clientId !== undefined
          ? paypal.clientId.trim() || undefined
          : existing.paypalClientId,
      paypalClientSecret: this.mergeSecretField(
        paypal?.clientSecret,
        existing.paypalClientSecret,
      ),
      paypalWebhookId:
        paypal?.webhookId !== undefined
          ? paypal.webhookId.trim() || undefined
          : existing.paypalWebhookId,
      stripeTerminalEnabled: terminal?.enabled ?? existing.stripeTerminalEnabled,
      stripeTerminalLocationId:
        terminal?.locationId !== undefined
          ? terminal.locationId.trim() || undefined
          : existing.stripeTerminalLocationId,
      stripeTerminalDefaultReaderId:
        terminal?.defaultReaderId !== undefined
          ? terminal.defaultReaderId.trim() || undefined
          : existing.stripeTerminalDefaultReaderId,
      updatedAt: new Date(),
    };

    await this.saveRecord(updated);

    this.logger.log(`Updated payment settings for tenant ${tenantId}`);

    const stripeResolved = this.resolveStripeConfig(updated);
    const paypalResolved = this.resolvePayPalConfig(updated);
    return this.toPublic(tenantId, updated, stripeResolved.source, paypalResolved.source);
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

  resolvePayPalConfig(record?: TenantPaymentSettingsRecord): ResolvedPayPalConfig {
    const envClientId = process.env.PAYPAL_CLIENT_ID?.trim();
    const envClientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
    const envWebhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();

    if (record?.paypalClientSecret?.trim()) {
      return {
        enabled: record.paypalEnabled,
        mode: record.paypalMode,
        clientId: record.paypalClientId?.trim() || undefined,
        clientSecret: record.paypalClientSecret.trim(),
        webhookId: record.paypalWebhookId?.trim() || undefined,
        source: 'tenant',
      };
    }

    if (!this.usePostgres && envClientSecret && envClientId) {
      return {
        enabled: true,
        mode: envClientId.includes('sandbox') || envClientId.startsWith('sb-') ? 'test' : 'live',
        clientId: envClientId,
        clientSecret: envClientSecret,
        webhookId: envWebhookId || undefined,
        source: 'env',
      };
    }

    return {
      enabled: false,
      mode: 'test',
      source: 'none',
    };
  }

  async resolvePayPalConfigForTenant(tenantId: string): Promise<ResolvedPayPalConfig> {
    const record = await this.loadRecord(tenantId);
    return this.resolvePayPalConfig(record);
  }

  isPayPalLiveForTenant(config: ResolvedPayPalConfig): boolean {
    return Boolean(config.enabled && config.clientId?.trim() && config.clientSecret?.trim());
  }

  async resolveTerminalConfigForTenant(tenantId: string): Promise<ResolvedStripeTerminalConfig> {
    const record = await this.loadRecord(tenantId);
    const stripe = this.resolveStripeConfig(record);
    const enabled = Boolean(
      record?.stripeTerminalEnabled &&
        this.isStripeLiveForTenant(stripe) &&
        record.stripeTerminalLocationId?.trim(),
    );
    return {
      enabled,
      locationId: record?.stripeTerminalLocationId?.trim() || undefined,
      defaultReaderId: record?.stripeTerminalDefaultReaderId?.trim() || undefined,
    };
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
        stripeTerminalEnabled: record.stripeTerminalEnabled,
        stripeTerminalLocationId: record.stripeTerminalLocationId,
        stripeTerminalDefaultReaderId: record.stripeTerminalDefaultReaderId,
        paypalEnabled: record.paypalEnabled,
        paypalMode: record.paypalMode,
        paypalClientId: record.paypalClientId,
        paypalClientSecret: record.paypalClientSecret,
        paypalWebhookId: record.paypalWebhookId,
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
      stripeTerminalEnabled: record.stripeTerminalEnabled,
      stripeTerminalLocationId: record.stripeTerminalLocationId,
      stripeTerminalDefaultReaderId: record.stripeTerminalDefaultReaderId,
      paypalEnabled: record.paypalEnabled,
      paypalMode: record.paypalMode,
      paypalClientId: record.paypalClientId,
      paypalClientSecret: record.paypalClientSecret,
      paypalWebhookId: record.paypalWebhookId,
    });
  }

  private emptyRecord(tenantId: string): TenantPaymentSettingsRecord {
    return {
      tenantId,
      stripeEnabled: false,
      stripeMode: 'test',
      stripeTerminalEnabled: false,
      paypalEnabled: false,
      paypalMode: 'test',
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
      stripeTerminalEnabled: row.stripeTerminalEnabled,
      stripeTerminalLocationId: row.stripeTerminalLocationId,
      stripeTerminalDefaultReaderId: row.stripeTerminalDefaultReaderId,
      paypalEnabled: row.paypalEnabled,
      paypalMode: row.paypalMode,
      paypalClientId: row.paypalClientId,
      paypalClientSecret: row.paypalClientSecret,
      paypalWebhookId: row.paypalWebhookId,
      updatedAt: row.updatedAt,
    };
  }

  private toPublic(
    tenantId: string,
    record: TenantPaymentSettingsRecord | undefined,
    stripeSource: PaymentSettingsSource,
    paypalSource: PaymentSettingsSource,
  ): TenantPaymentSettingsPublic {
    const stripeResolved = this.resolveStripeConfig(record);
    const paypalResolved = this.resolvePayPalConfig(record);
    const terminal = this.buildTerminalPublic(record, stripeResolved);
    const source: PaymentSettingsSource =
      stripeSource === 'tenant' || paypalSource === 'tenant'
        ? 'tenant'
        : stripeSource === 'env' || paypalSource === 'env'
          ? 'env'
          : 'none';
    return {
      tenantId,
      stripe: {
        enabled: stripeResolved.enabled,
        mode: stripeResolved.mode,
        publishableKey: stripeResolved.publishableKey,
        hasSecretKey: Boolean(stripeResolved.secretKey),
        hasWebhookSecret: Boolean(stripeResolved.webhookSecret),
      },
      paypal: {
        enabled: paypalResolved.enabled,
        mode: paypalResolved.mode,
        clientId: paypalResolved.clientId,
        hasClientSecret: Boolean(paypalResolved.clientSecret),
        hasWebhookId: Boolean(paypalResolved.webhookId),
      },
      terminal,
      source,
      testCapabilities: this.buildTestCapabilities(stripeResolved, paypalResolved, record),
      updatedAt: record?.updatedAt.toISOString(),
    };
  }

  private buildTerminalPublic(
    record: TenantPaymentSettingsRecord | undefined,
    resolved: ResolvedStripeConfig,
  ) {
    const locationId = record?.stripeTerminalLocationId?.trim() || undefined;
    const defaultReaderId = record?.stripeTerminalDefaultReaderId?.trim() || undefined;
    const enabled = Boolean(
      record?.stripeTerminalEnabled && this.isStripeLiveForTenant(resolved) && locationId,
    );
    return {
      enabled,
      locationId,
      defaultReaderId,
      hasLocation: Boolean(locationId),
      hasDefaultReader: Boolean(defaultReaderId),
    };
  }

  private buildTestCapabilities(
    stripeResolved: ResolvedStripeConfig,
    paypalResolved: ResolvedPayPalConfig,
    record?: TenantPaymentSettingsRecord,
  ): PaymentTestCapabilities {
    return {
      stripeLive: this.isStripeLiveForTenant(stripeResolved),
      razorpayLive: isRazorpayLive(),
      paypalLive: this.isPayPalLiveForTenant(paypalResolved),
      stripeTerminalConfigured: Boolean(
        record?.stripeTerminalEnabled &&
          record.stripeTerminalLocationId?.trim() &&
          this.isStripeLiveForTenant(stripeResolved),
      ),
      applePayDomainConfigured: Boolean(
        process.env.APPLE_PAY_DOMAIN_ASSOCIATION?.trim() ||
          (process.env.WEB_PAY_ORIGIN?.startsWith('https://') &&
            this.isStripeLiveForTenant(stripeResolved)),
      ),
      demoUpiVpa: process.env.DEMO_UPI_VPA?.trim() || 'temple.demo@upi',
      webPayOrigin:
        process.env.WEB_PAY_ORIGIN?.trim() ||
        process.env.CORS_ORIGIN?.trim() ||
        'http://localhost:3001',
      stripeWebhookConfigured: Boolean(stripeResolved.webhookSecret || stripeWebhookSecret()),
      razorpayWebhookConfigured: Boolean(razorpayWebhookSecret()),
      paypalWebhookConfigured: Boolean(
        paypalResolved.webhookId || paypalWebhookSecret() || isPayPalLive(),
      ),
    };
  }
}

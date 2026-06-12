import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import Stripe from 'stripe';
import { Currency } from '@tms/types';
import { TenantPaymentSettingsService } from '../settings/tenant-payment-settings.service';
import { toStripeAmount } from './payment-config';

export interface StripeIntentResult {
  paymentIntentId: string;
  clientSecret: string;
}

export interface StripeTerminalReaderInfo {
  id: string;
  label: string;
  deviceType: string;
  status: string;
  serialNumber?: string;
  ipAddress?: string;
  locationId?: string;
}

@Injectable()
export class StripeProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private readonly clients = new Map<string, Stripe>();

  constructor(private readonly paymentSettings: TenantPaymentSettingsService) {}

  private async getClient(tenantId: string): Promise<Stripe | null> {
    const config = await this.paymentSettings.resolveStripeConfigForTenant(tenantId);
    if (!this.paymentSettings.isStripeLiveForTenant(config) || !config.secretKey) {
      return null;
    }

    const cacheKey = `${tenantId}:${config.secretKey}`;
    const cached = this.clients.get(cacheKey);
    if (cached) {
      return cached;
    }

    const client = new Stripe(config.secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
    this.clients.set(cacheKey, client);
    return client;
  }

  async createPaymentIntent(opts: {
    amount: number;
    currency: Currency;
    purpose: string;
    sessionId: string;
    tenantId: string;
    devoteeId?: string;
  }): Promise<StripeIntentResult | null> {
    const stripe = await this.getClient(opts.tenantId);
    if (!stripe) {
      return null;
    }

    const config = await this.paymentSettings.resolveStripeConfigForTenant(opts.tenantId);
    const isTestMode =
      config.mode === 'test' || Boolean(config.secretKey?.startsWith('sk_test_'));

    const intent = await stripe.paymentIntents.create({
      amount: toStripeAmount(opts.amount, opts.currency),
      currency: opts.currency.toLowerCase(),
      description: opts.purpose,
      metadata: {
        sessionId: opts.sessionId,
        tenantId: opts.tenantId,
        ...(opts.devoteeId ? { devoteeId: opts.devoteeId } : {}),
      },
      ...(isTestMode
        ? { payment_method_types: ['card'] }
        : {
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: 'always',
            },
          }),
    });

    this.logger.log(`Created Stripe PaymentIntent ${intent.id} for session ${opts.sessionId}`);

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret!,
    };
  }

  async createCardPresentPaymentIntent(opts: {
    amount: number;
    currency: Currency;
    purpose: string;
    sessionId: string;
    tenantId: string;
    devoteeId?: string;
  }): Promise<StripeIntentResult | null> {
    const stripe = await this.getClient(opts.tenantId);
    if (!stripe) {
      return null;
    }

    const intent = await stripe.paymentIntents.create({
      amount: toStripeAmount(opts.amount, opts.currency),
      currency: opts.currency.toLowerCase(),
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      description: opts.purpose,
      metadata: {
        sessionId: opts.sessionId,
        tenantId: opts.tenantId,
        channel: 'counter_terminal',
        ...(opts.devoteeId ? { devoteeId: opts.devoteeId } : {}),
      },
    });

    this.logger.log(
      `Created card-present PaymentIntent ${intent.id} for session ${opts.sessionId}`,
    );

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret!,
    };
  }

  async listTerminalReaders(
    tenantId: string,
    locationId: string,
  ): Promise<StripeTerminalReaderInfo[]> {
    const stripe = await this.getClient(tenantId);
    if (!stripe) {
      return [];
    }

    const readers = await stripe.terminal.readers.list({
      location: locationId,
      limit: 100,
    });

    return readers.data.map((reader) => ({
      id: reader.id,
      label: reader.label ?? reader.id,
      deviceType: reader.device_type ?? 'unknown',
      status: reader.status ?? 'unknown',
      serialNumber: reader.serial_number ?? undefined,
      ipAddress: reader.ip_address ?? undefined,
      locationId: typeof reader.location === 'string' ? reader.location : reader.location?.id,
    }));
  }

  async ensureSimulatedReader(tenantId: string, locationId: string): Promise<string> {
    const stripe = await this.getClient(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this temple');
    }

    const existing = await stripe.terminal.readers.list({
      location: locationId,
      limit: 100,
    });
    const simulated = existing.data.find((reader) =>
      reader.device_type?.startsWith('simulated_'),
    );
    if (simulated) {
      return simulated.id;
    }

    const reader = await stripe.terminal.readers.create({
      registration_code: 'simulated-wpe',
      label: 'Simulated WisePOS E (demo)',
      location: locationId,
    });
    this.logger.log(`Created simulated Terminal reader ${reader.id} for location ${locationId}`);
    return reader.id;
  }

  async processPaymentIntentOnReader(
    tenantId: string,
    readerId: string,
    paymentIntentId: string,
  ): Promise<void> {
    const stripe = await this.getClient(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this temple');
    }

    await stripe.terminal.readers.processPaymentIntent(readerId, {
      payment_intent: paymentIntentId,
    });
  }

  async simulateTerminalPayment(tenantId: string, readerId: string): Promise<void> {
    const stripe = await this.getClient(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this temple');
    }

    const config = await this.paymentSettings.resolveStripeConfigForTenant(tenantId);
    const isTestMode =
      config.mode === 'test' || Boolean(config.secretKey?.startsWith('sk_test_'));
    if (!isTestMode) {
      return;
    }

    await stripe.testHelpers.terminal.readers.presentPaymentMethod(readerId, {
      type: 'card_present',
      card_present: { number: '4242424242424242' },
    });
  }

  async cancelReaderAction(tenantId: string, readerId: string): Promise<void> {
    const stripe = await this.getClient(tenantId);
    if (!stripe) {
      return;
    }

    try {
      await stripe.terminal.readers.cancelAction(readerId);
    } catch (err) {
      this.logger.warn(`Could not cancel reader action on ${readerId}: ${String(err)}`);
    }
  }

  async retrievePaymentIntentStatus(
    tenantId: string,
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent.Status | null> {
    const stripe = await this.getClient(tenantId);
    if (!stripe) {
      return null;
    }
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return intent.status;
  }

  async constructWebhookEvent(
    tenantId: string,
    payload: Buffer,
    signature: string,
  ): Promise<Stripe.Event> {
    const config = await this.paymentSettings.resolveStripeConfigForTenant(tenantId);
    const secret = config.webhookSecret;
    if (!secret) {
      throw new UnauthorizedException('Stripe webhook secret is not configured for this tenant');
    }
    const stripe = await this.getClient(tenantId);
    if (!stripe) {
      throw new UnauthorizedException('Stripe live mode is not configured for this tenant');
    }
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${String(err)}`);
      throw new UnauthorizedException('Invalid Stripe webhook signature');
    }
  }
}

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import Stripe from 'stripe';
import { Currency } from '@tms/types';
import { TenantPaymentSettingsService } from '../settings/tenant-payment-settings.service';
import { toStripeAmount } from './payment-config';

export interface StripeIntentResult {
  paymentIntentId: string;
  clientSecret: string;
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

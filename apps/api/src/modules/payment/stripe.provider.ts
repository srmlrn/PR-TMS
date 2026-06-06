import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import Stripe from 'stripe';
import { Currency } from '@tms/types';
import { isStripeLive, stripeWebhookSecret, toStripeAmount } from './payment-config';

export interface StripeIntentResult {
  paymentIntentId: string;
  clientSecret: string;
}

@Injectable()
export class StripeProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private client: Stripe | null = null;

  private getClient(): Stripe | null {
    if (!isStripeLive()) {
      return null;
    }
    if (!this.client) {
      this.client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-02-24.acacia',
      });
    }
    return this.client;
  }

  async createPaymentIntent(opts: {
    amount: number;
    currency: Currency;
    purpose: string;
    sessionId: string;
    tenantId: string;
    devoteeId?: string;
  }): Promise<StripeIntentResult | null> {
    const stripe = this.getClient();
    if (!stripe) {
      return null;
    }

    const intent = await stripe.paymentIntents.create({
      amount: toStripeAmount(opts.amount, opts.currency),
      currency: opts.currency.toLowerCase(),
      description: opts.purpose,
      metadata: {
        sessionId: opts.sessionId,
        tenantId: opts.tenantId,
        ...(opts.devoteeId ? { devoteeId: opts.devoteeId } : {}),
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always',
      },
    });

    this.logger.log(`Created Stripe PaymentIntent ${intent.id} for session ${opts.sessionId}`);

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret!,
    };
  }

  async retrievePaymentIntentStatus(paymentIntentId: string): Promise<Stripe.PaymentIntent.Status | null> {
    const stripe = this.getClient();
    if (!stripe) {
      return null;
    }
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return intent.status;
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = stripeWebhookSecret();
    if (!secret) {
      throw new UnauthorizedException('STRIPE_WEBHOOK_SECRET is not configured');
    }
    const stripe = this.getClient();
    if (!stripe) {
      throw new UnauthorizedException('Stripe live mode is not configured');
    }
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${String(err)}`);
      throw new UnauthorizedException('Invalid Stripe webhook signature');
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { Currency } from '@tms/types';
import { isStripeLive, toStripeAmount } from './payment-config';

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
        ...(opts.devoteeId ? { devoteeId: opts.devoteeId } : {}),
      },
      automatic_payment_methods: { enabled: true },
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

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event | null {
    const stripe = this.getClient();
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!stripe || !secret) {
      return null;
    }
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }
}

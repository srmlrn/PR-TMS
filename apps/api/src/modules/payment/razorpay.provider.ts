import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { Currency } from '@tms/types';
import { isRazorpayLive, razorpayWebhookSecret, toRazorpayAmount } from './payment-config';

export interface RazorpayOrderResult {
  orderId: string;
}

@Injectable()
export class RazorpayProvider {
  private readonly logger = new Logger(RazorpayProvider.name);
  private client: Razorpay | null = null;

  private getClient(): Razorpay | null {
    if (!isRazorpayLive()) {
      return null;
    }
    if (!this.client) {
      this.client = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });
    }
    return this.client;
  }

  async createOrder(opts: {
    amount: number;
    currency: Currency;
    purpose: string;
    sessionId: string;
    tenantId: string;
    devoteeId?: string;
  }): Promise<RazorpayOrderResult | null> {
    const razorpay = this.getClient();
    if (!razorpay) {
      return null;
    }

    const order = await razorpay.orders.create({
      amount: toRazorpayAmount(opts.amount, opts.currency),
      currency: opts.currency,
      receipt: opts.sessionId.slice(0, 40),
      notes: {
        purpose: opts.purpose,
        sessionId: opts.sessionId,
        tenantId: opts.tenantId,
        ...(opts.devoteeId ? { devoteeId: opts.devoteeId } : {}),
      },
    });

    this.logger.log(`Created Razorpay order ${order.id} for session ${opts.sessionId}`);

    return { orderId: order.id };
  }

  async fetchOrderStatus(orderId: string): Promise<string | null> {
    const razorpay = this.getClient();
    if (!razorpay) {
      return null;
    }
    const order = await razorpay.orders.fetch(orderId);
    return order.status ?? null;
  }

  verifyWebhookSignature(payload: Buffer | string, signature: string): boolean {
    const secret = razorpayWebhookSecret();
    if (!secret) {
      throw new UnauthorizedException('RAZORPAY_WEBHOOK_SECRET is not configured');
    }
    const body = typeof payload === 'string' ? payload : payload.toString('utf8');
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expected !== signature) {
      this.logger.warn('Razorpay webhook signature verification failed');
      throw new UnauthorizedException('Invalid Razorpay webhook signature');
    }
    return true;
  }
}

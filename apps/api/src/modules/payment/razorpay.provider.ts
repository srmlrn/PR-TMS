import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import { Currency } from '@tms/types';
import { isRazorpayLive, toRazorpayAmount } from './payment-config';

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
}

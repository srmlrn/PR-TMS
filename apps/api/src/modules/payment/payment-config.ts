import { Currency } from '@tms/types';

export function isStripeLive(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isRazorpayLive(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim(),
  );
}

export function stripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}

export function razorpayWebhookSecret(): string | undefined {
  return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || undefined;
}

/** Smallest currency unit for Stripe (cents/paise). */
export function toStripeAmount(amount: number, _currency: Currency): number {
  return Math.round(amount * 100);
}

/** Razorpay expects amount in paise for INR. */
export function toRazorpayAmount(amount: number, currency: Currency): number {
  if (currency === Currency.INR) {
    return Math.round(amount * 100);
  }
  return Math.round(amount * 100);
}

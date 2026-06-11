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

/** Demo UPI VPA shown in test QR codes (INR). */
export function demoUpiVpa(): string {
  return process.env.DEMO_UPI_VPA?.trim() || 'temple.demo@upi';
}

/** Public web origin for pay-by-QR links (defaults to CORS origin). */
export function webPayOrigin(): string {
  return (
    process.env.WEB_PAY_ORIGIN?.trim() ||
    process.env.CORS_ORIGIN?.trim() ||
    'http://localhost:3001'
  );
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

import type { Currency, PaymentProvider } from '@tms/types';
import type { Endpoints } from './api/endpoints';

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: 'Stripe (card)',
  razorpay: 'Razorpay (INR)',
  demo: 'Demo / test',
  cash: 'Cash (counter)',
};

export function availablePaymentProviders(channel?: string): PaymentProvider[] {
  if (channel === 'counter') {
    return ['cash', 'stripe', 'razorpay', 'demo'];
  }
  return ['stripe', 'razorpay', 'demo'];
}

export function defaultPaymentProvider(
  currency: Currency,
  channel?: string,
): PaymentProvider {
  if (channel === 'counter') return 'cash';
  return currency === 'INR' ? 'razorpay' : 'stripe';
}

export async function checkoutAndPay(
  ep: Endpoints,
  opts: {
    amount: number;
    currency: Currency;
    purpose: string;
    devoteeId?: string;
    provider?: PaymentProvider;
  },
): Promise<string> {
  const provider =
    opts.provider ??
    (opts.currency === 'INR' ? 'razorpay' : 'stripe');

  const session = await ep.createPaymentSession({
    amount: opts.amount,
    currency: opts.currency,
    provider,
    purpose: opts.purpose,
    devoteeId: opts.devoteeId,
  });

  await ep.confirmPaymentSession(session.id);
  return session.id;
}

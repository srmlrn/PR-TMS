import type { Currency, PaymentProvider } from '@tms/types';
import type { Endpoints } from './api/endpoints';

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

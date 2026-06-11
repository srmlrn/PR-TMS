import type { Currency, PaymentProvider, PaymentSession } from '@tms/types';
import type { Endpoints } from './api/endpoints';

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: 'Card · Apple Pay · Google Pay',
  razorpay: 'Razorpay (INR · UPI in checkout)',
  qr: 'QR / UPI scan',
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

export function requiresLiveClientPayment(session: PaymentSession): boolean {
  if (session.provider === 'qr') {
    return Boolean(session.qrPayload || session.qrImageUrl);
  }
  return (
    session.paymentMode === 'live' &&
    (session.provider === 'stripe' || session.provider === 'razorpay')
  );
}

export interface LivePaymentGate {
  runLivePayment(session: PaymentSession): Promise<void>;
}

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 30;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll until the server marks the session paid (typically via PSP webhook). */
export async function waitForSessionPaid(
  ep: Endpoints,
  sessionId: string,
): Promise<PaymentSession> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const session = await ep.getPaymentSession(sessionId);
    if (session.status === 'paid') {
      return session;
    }
    if (session.status === 'failed') {
      throw new Error('Payment failed. Please try again.');
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Payment confirmation timed out. Check your receipt or try again.');
}

export function createLivePaymentGate(
  present: (session: PaymentSession) => Promise<void>,
): LivePaymentGate {
  return { runLivePayment: present };
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
  gate?: LivePaymentGate,
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

  if (session.provider === 'qr') {
    if (!gate) {
      throw new Error(
        'QR payment requires a payment modal. Integrate LivePaymentModal via createLivePaymentGate.',
      );
    }
    await gate.runLivePayment(session);
    if (session.paymentMode === 'live') {
      await waitForSessionPaid(ep, session.id);
    } else {
      const updated = await ep.getPaymentSession(session.id);
      if (updated.status !== 'paid') {
        throw new Error('QR payment was not completed.');
      }
    }
    return session.id;
  }

  if (!requiresLiveClientPayment(session)) {
    await ep.confirmPaymentSession(session.id);
    return session.id;
  }

  if (!gate) {
    throw new Error(
      'Live payment requires a payment modal. Integrate LivePaymentModal via createLivePaymentGate.',
    );
  }

  await gate.runLivePayment(session);
  await waitForSessionPaid(ep, session.id);
  return session.id;
}

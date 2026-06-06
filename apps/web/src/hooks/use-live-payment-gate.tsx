'use client';

import { useMemo, useState } from 'react';
import type { PaymentSession } from '@tms/types';
import { LivePaymentModal } from '@/components/LivePaymentModal';
import { createLivePaymentGate, type LivePaymentGate } from '@/lib/payment-flow';

export interface LivePaymentPayerInfo {
  name?: string;
  email?: string;
  phone?: string;
}

interface PendingLivePayment {
  session: PaymentSession;
  resolve: () => void;
  reject: (err: Error) => void;
  payer?: LivePaymentPayerInfo;
}

/** Shared Stripe/Razorpay checkout modal gate for checkoutAndPay live sessions. */
export function useLivePaymentGate(getPayer?: () => LivePaymentPayerInfo) {
  const [pending, setPending] = useState<PendingLivePayment | null>(null);

  const gate: LivePaymentGate = useMemo(
    () =>
      createLivePaymentGate(
        (session) =>
          new Promise<void>((resolve, reject) => {
            setPending({
              session,
              resolve,
              reject,
              payer: getPayer?.(),
            });
          }),
      ),
    [getPayer],
  );

  const livePaymentModal = pending ? (
    <LivePaymentModal
      session={pending.session}
      payerName={pending.payer?.name}
      payerEmail={pending.payer?.email}
      payerPhone={pending.payer?.phone}
      onSuccess={() => {
        pending.resolve();
        setPending(null);
      }}
      onCancel={() => {
        pending.reject(new Error('Payment cancelled'));
        setPending(null);
      }}
    />
  ) : null;

  return { gate, livePaymentModal };
}

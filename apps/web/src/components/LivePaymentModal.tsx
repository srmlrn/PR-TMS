'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Button } from '@tms/ui';
import type { PaymentSession } from '@tms/types';
import { formatMoney } from '@/lib/api/endpoints';
import { useTheme } from '@/lib/theme-context';
import styles from './live-payment-modal.module.css';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay is only available in the browser'));
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

function toRazorpayAmount(amount: number, currency: string): number {
  return Math.round(amount * 100);
}

interface StripeCheckoutFormProps {
  session: PaymentSession;
  onSuccess: () => void;
  onError: (message: string) => void;
}

function StripeCheckoutForm({ session, onSuccess, onError }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/devotee/payment-return?sessionId=${session.id}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message ?? 'Card payment failed');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        onSuccess();
        return;
      }

      if (paymentIntent?.status === 'processing') {
        onSuccess();
        return;
      }

      onError(`Unexpected payment status: ${paymentIntent?.status ?? 'unknown'}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.stripeForm}>
      <PaymentElement
        options={{
          layout: { type: 'tabs', defaultCollapsed: false },
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />
      <p className={styles.walletHint}>Apple Pay and Google Pay appear when supported on this device.</p>
      <Button
        variant="primary"
        fullWidth
        className="mt1"
        onClick={handleSubmit}
        disabled={!stripe || !elements || submitting}
      >
        {submitting ? 'Processing…' : `Pay ${formatMoney(session.amount, session.currency)}`}
      </Button>
    </div>
  );
}

export interface LivePaymentModalProps {
  session: PaymentSession;
  onSuccess: () => void;
  onCancel: () => void;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
}

export function LivePaymentModal({
  session,
  onSuccess,
  onCancel,
  payerName,
  payerEmail,
  payerPhone,
}: LivePaymentModalProps) {
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);

  const stripeElementsOptions = useMemo(
    () => ({
      clientSecret: session.clientSecret!,
      appearance: {
        theme: (theme === 'light' ? 'stripe' : 'night') as 'stripe' | 'night',
        variables: {
          colorPrimary: theme === 'light' ? '#1a9b6e' : '#c9a227',
        },
      },
      wallets: { applePay: 'auto' as const, googlePay: 'auto' as const },
    }),
    [session.clientSecret, theme],
  );

  const stripePromise = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
    return key ? loadStripe(key) : null;
  }, []);

  const openRazorpay = useCallback(async () => {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
    if (!keyId) {
      setError('NEXT_PUBLIC_RAZORPAY_KEY_ID is not configured');
      return;
    }
    if (!session.providerRefId) {
      setError('Razorpay order id missing from payment session');
      return;
    }

    try {
      await loadRazorpayScript();
      setRazorpayReady(true);

      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        setError('Razorpay checkout failed to initialize');
        return;
      }

      const rzp = new Razorpay({
        key: keyId,
        amount: toRazorpayAmount(session.amount, session.currency),
        currency: session.currency,
        name: 'Temple Management',
        description: session.purpose,
        order_id: session.providerRefId,
        handler: () => onSuccess(),
        modal: { ondismiss: onCancel },
        prefill: {
          name: payerName,
          email: payerEmail,
          contact: payerPhone,
        },
        theme: { color: '#c9a227' },
      });

      rzp.on('payment.failed', () => {
        setError('Razorpay payment failed. Please try again.');
      });

      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Razorpay checkout failed');
    }
  }, [session, onSuccess, onCancel, payerName, payerEmail, payerPhone]);

  useEffect(() => {
    if (session.provider === 'razorpay') {
      void openRazorpay();
    }
  }, [session.provider, openRazorpay]);

  const title =
    session.provider === 'stripe'
      ? 'Pay with Apple Pay, Google Pay, or card'
      : session.provider === 'razorpay'
        ? 'Pay with Razorpay'
        : 'Complete payment';

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="live-pay-title">
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2 id="live-pay-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.subtitle}>
            {session.purpose} · {formatMoney(session.amount, session.currency)}
          </p>
        </header>

        {session.provider === 'stripe' && (
          <>
            {!session.clientSecret ? (
              <p className={styles.error}>Stripe client secret missing from payment session.</p>
            ) : !stripePromise ? (
              <p className={styles.error}>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured.</p>
            ) : (
              <Elements stripe={stripePromise} options={stripeElementsOptions}>
                <StripeCheckoutForm
                  session={session}
                  onSuccess={onSuccess}
                  onError={setError}
                />
              </Elements>
            )}
          </>
        )}

        {session.provider === 'razorpay' && (
          <div className={styles.razorpayHint}>
            {razorpayReady ? (
              <p className="tms-t2">Razorpay checkout should open in a new window.</p>
            ) : (
              <p className="tms-t2">Loading Razorpay checkout…</p>
            )}
            <Button variant="outline" fullWidth className="mt1" onClick={openRazorpay}>
              Re-open Razorpay
            </Button>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <footer className={styles.footer}>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </footer>
      </div>
    </div>
  );
}

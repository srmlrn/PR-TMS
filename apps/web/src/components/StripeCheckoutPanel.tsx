'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Button } from '@tms/ui';
import type { PaymentSession } from '@tms/types';
import { formatMoney } from '@/lib/api/endpoints';
import { useTheme } from '@/lib/theme-context';
import styles from './live-payment-modal.module.css';

function isStripeTestKey(publishableKey?: string): boolean {
  return publishableKey?.startsWith('pk_test_') ?? false;
}

interface FormProps {
  session: PaymentSession;
  returnUrl: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  isTestMode: boolean;
  preferWallet?: boolean;
}

function StripeCheckoutForm({
  session,
  returnUrl,
  onSuccess,
  onError,
  isTestMode,
  preferWallet,
}: FormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [expressReady, setExpressReady] = useState(false);

  async function confirmStripePayment() {
    if (!stripe || !elements) return false;
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message ?? 'Payment failed');
      return false;
    }

    if (
      paymentIntent?.status === 'succeeded' ||
      paymentIntent?.status === 'processing'
    ) {
      onSuccess();
      return true;
    }

    onError(`Unexpected payment status: ${paymentIntent?.status ?? 'unknown'}`);
    return false;
  }

  async function handleCardSubmit() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      await confirmStripePayment();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExpressConfirm() {
    setSubmitting(true);
    try {
      await confirmStripePayment();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Wallet payment failed');
    } finally {
      setSubmitting(false);
    }
  }

  const showExpress = !isTestMode || preferWallet;

  return (
    <div className={styles.stripeForm}>
      {isTestMode && !preferWallet ? (
        <div className={styles.demoBanner} role="note">
          <strong>Demo test card</strong>
          <p>
            Use <code>4242 4242 4242 4242</code>, any future expiry, any CVC. On iPhone you can
            also use Apple Pay (test mode — no real charge).
          </p>
        </div>
      ) : (
        showExpress && (
          <>
            <ExpressCheckoutElement
              onConfirm={handleExpressConfirm}
              onReady={({ availablePaymentMethods }) => {
                setExpressReady(
                  Boolean(
                    availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay,
                  ),
                );
              }}
              options={{
                buttonTheme: { applePay: 'black' },
                buttonType: { applePay: 'buy', googlePay: 'buy' },
                paymentMethods: {
                  applePay: 'auto',
                  googlePay: 'auto',
                  link: 'never',
                  paypal: 'never',
                  amazonPay: 'never',
                  klarna: 'never',
                },
              }}
            />
            {expressReady && <p className={styles.walletDivider}>or pay with card</p>}
          </>
        )
      )}
      <div className={styles.stripeElementWrap}>
        <PaymentElement
          options={{
            layout: { type: 'tabs', defaultCollapsed: false },
            paymentMethodOrder: ['card'],
            wallets: { applePay: 'never', googlePay: 'never' },
          }}
        />
      </div>
      <Button
        variant="primary"
        fullWidth
        className="mt1"
        onClick={handleCardSubmit}
        disabled={!stripe || !elements || submitting}
      >
        {submitting ? 'Processing…' : `Pay ${formatMoney(session.amount, session.currency)}`}
      </Button>
    </div>
  );
}

export interface StripeCheckoutPanelProps {
  session: PaymentSession;
  returnUrl: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  /** Show Apple Pay / Google Pay express buttons (mobile QR checkout). */
  preferWallet?: boolean;
}

export function StripeCheckoutPanel({
  session,
  returnUrl,
  onSuccess,
  onError,
  preferWallet = false,
}: StripeCheckoutPanelProps) {
  const { theme } = useTheme();
  const stripePublishableKey = session.stripePublishableKey?.trim();
  const isTestMode = isStripeTestKey(stripePublishableKey);

  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );

  const stripeElementsOptions = useMemo(
    () => ({
      clientSecret: session.clientSecret!,
      appearance: {
        theme: (theme === 'light' ? 'stripe' : 'night') as 'stripe' | 'night',
        variables: {
          colorPrimary: theme === 'light' ? '#1a9b6e' : '#c9a227',
        },
      },
    }),
    [session.clientSecret, theme],
  );

  if (!session.clientSecret || !stripePromise) {
    return <p className={styles.error}>Stripe checkout is not available for this session.</p>;
  }

  return (
    <Elements stripe={stripePromise} options={stripeElementsOptions}>
      <StripeCheckoutForm
        session={session}
        returnUrl={returnUrl}
        onSuccess={onSuccess}
        onError={onError}
        isTestMode={isTestMode}
        preferWallet={preferWallet}
      />
    </Elements>
  );
}

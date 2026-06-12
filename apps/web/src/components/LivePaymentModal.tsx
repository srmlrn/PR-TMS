'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { createEndpoints } from '@/lib/api/endpoints';
import { useTheme } from '@/lib/theme-context';
import { useTenant } from '@/lib/tenant-context';
import { useTenantSite } from '@/lib/tenant-site';
import { PaymentQrPanel } from '@/components/PaymentQrPanel';
import styles from './live-payment-modal.module.css';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
    paypal?: {
      Buttons: (options: PayPalButtonsOptions) => {
        render: (selector: string | HTMLElement) => Promise<void>;
        close: () => void;
      };
    };
  }
}

interface PayPalButtonsOptions {
  createOrder: () => string | Promise<string>;
  onApprove: (data: { orderID: string }) => void | Promise<void>;
  onCancel?: () => void;
  onError?: (err: { message?: string }) => void;
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

function loadPayPalScript(clientId: string, currency: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('PayPal is only available in the browser'));
  }
  if (window.paypal) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load PayPal SDK')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture&enable-funding=venmo,paypal&disable-funding=credit,card`;
    script.async = true;
    script.dataset.paypalSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);
  });
}

function toRazorpayAmount(amount: number, currency: string): number {
  return Math.round(amount * 100);
}

function isStripeTestKey(publishableKey?: string): boolean {
  return publishableKey?.startsWith('pk_test_') ?? false;
}

interface StripeCheckoutFormProps {
  session: PaymentSession;
  onSuccess: () => void;
  onError: (message: string) => void;
  isTestMode: boolean;
}

function StripeCheckoutForm({ session, onSuccess, onError, isTestMode }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [expressReady, setExpressReady] = useState(false);

  const returnUrl = `${window.location.origin}/devotee/payment-return?sessionId=${session.id}`;

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

  return (
    <div className={styles.stripeForm}>
      {isTestMode ? (
        <div className={styles.demoBanner} role="note">
          <strong>Demo test card</strong>
          <p>
            Use card <code>4242 4242 4242 4242</code>, any future expiry, any CVC. Apple Pay here
            would charge your real wallet — use the card form for safe demos.
          </p>
        </div>
      ) : (
        <>
          <ExpressCheckoutElement
            onConfirm={handleExpressConfirm}
            onReady={({ availablePaymentMethods }) => {
              setExpressReady(
                Boolean(availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay),
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
      {!isTestMode && !expressReady && (
        <p className={styles.walletHint}>
          Apple Pay and Google Pay appear above on supported browsers.
        </p>
      )}
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

interface PayPalCheckoutPanelProps {
  session: PaymentSession;
  ep: ReturnType<typeof createEndpoints>;
  onSuccess: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

function PayPalCheckoutPanel({
  session,
  ep,
  onSuccess,
  onCancel,
  onError,
}: PayPalCheckoutPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clientId = session.paypalClientId?.trim();
    if (!clientId || !session.providerRefId || !containerRef.current) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let buttons:
      | {
          render: (selector: string | HTMLElement) => Promise<void>;
          close: () => void;
        }
      | undefined;

    void (async () => {
      try {
        await loadPayPalScript(clientId, session.currency);
        if (cancelled || !window.paypal || !containerRef.current) {
          return;
        }

        buttons = window.paypal.Buttons({
          createOrder: () => session.providerRefId!,
          onApprove: async (data) => {
            try {
              await ep.capturePayPalOrder(session.id, data.orderID);
              onSuccess();
            } catch (err) {
              onError(err instanceof Error ? err.message : 'PayPal capture failed');
            }
          },
          onCancel: onCancel,
          onError: (err) => onError(err.message ?? 'PayPal checkout failed'),
        });

        await buttons.render(containerRef.current);
        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : 'PayPal checkout failed');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      buttons?.close();
    };
  }, [session, ep, onSuccess, onCancel, onError]);

  if (!session.paypalClientId?.trim()) {
    return (
      <p className={styles.error}>
        PayPal client id is not configured for this temple. Add it in Admin → Payment Settings.
      </p>
    );
  }

  if (!session.providerRefId) {
    return <p className={styles.error}>PayPal order id missing from payment session.</p>;
  }

  return (
    <div className={styles.paypalWrap}>
      {loading && <p className="tms-t2">Loading PayPal / Venmo…</p>}
      <div ref={containerRef} className={styles.paypalButtons} />
      <p className={styles.walletHint}>
        Venmo appears for US buyers when enabled in your PayPal sandbox buyer account.
      </p>
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
  const { api } = useTenant();
  const ep = useMemo(() => createEndpoints(api), [api]);
  const site = useTenantSite();
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
    }),
    [session.clientSecret, theme],
  );

  const stripePublishableKey = session.stripePublishableKey?.trim();
  const isStripeTestMode = isStripeTestKey(stripePublishableKey);

  const stripePromise = useMemo(() => {
    return stripePublishableKey ? loadStripe(stripePublishableKey) : null;
  }, [stripePublishableKey]);

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
        name: site.name,
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
  }, [session, site.name, onSuccess, onCancel, payerName, payerEmail, payerPhone]);

  useEffect(() => {
    if (session.provider === 'razorpay') {
      void openRazorpay();
    }
  }, [session.provider, openRazorpay]);

  const title =
    session.provider === 'stripe'
      ? isStripeTestMode
        ? 'Pay with Stripe test card'
        : 'Pay with Apple Pay, Google Pay, or card'
      : session.provider === 'qr'
        ? 'Pay by QR / UPI'
      : session.provider === 'razorpay'
        ? 'Pay with Razorpay'
      : session.provider === 'paypal'
        ? 'Pay with PayPal or Venmo'
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

        <div className={styles.modalBody}>
        {session.provider === 'qr' && (
          <PaymentQrPanel
            session={session}
            ep={ep}
            onSuccess={onSuccess}
            onError={setError}
          />
        )}

        {session.provider === 'stripe' && (
          <>
            {!session.clientSecret ? (
              <p className={styles.error}>Stripe client secret missing from payment session.</p>
            ) : !stripePromise ? (
              <p className={styles.error}>
                Stripe publishable key is not configured for this temple. Add it in Admin → Payment
                Settings.
              </p>
            ) : (
              <Elements stripe={stripePromise} options={stripeElementsOptions}>
                <StripeCheckoutForm
                  session={session}
                  onSuccess={onSuccess}
                  onError={setError}
                  isTestMode={isStripeTestMode}
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

        {session.provider === 'paypal' && (
          <PayPalCheckoutPanel
            session={session}
            ep={ep}
            onSuccess={onSuccess}
            onCancel={onCancel}
            onError={setError}
          />
        )}

        {error && <p className={styles.error}>{error}</p>}
        </div>

        <footer className={styles.footer}>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </footer>
      </div>
    </div>
  );
}

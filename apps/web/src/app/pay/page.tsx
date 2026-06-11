'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GlassCard } from '@tms/ui';
import { TenantEnvironment } from '@tms/types';
import type { PaymentSession } from '@tms/types';
import { PublicThemeBar } from '@/components/PublicThemeBar';
import { StripeCheckoutPanel } from '@/components/StripeCheckoutPanel';
import { createApiClient } from '@/lib/api/client';
import { createEndpoints, formatMoney } from '@/lib/api/endpoints';
import { waitForSessionPaid } from '@/lib/payment-flow';
import styles from '@/components/live-payment-modal.module.css';

function PublicPayInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const tenantId = searchParams.get('tenantId');
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const api = useMemo(() => {
    if (!tenantId) return null;
    return createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
      tenantId,
      environment: TenantEnvironment.PROD,
    });
  }, [tenantId]);

  const ep = useMemo(() => (api ? createEndpoints(api) : null), [api]);

  const returnUrl = useMemo(() => {
    if (typeof window === 'undefined' || !sessionId || !tenantId) return '';
    const params = new URLSearchParams({ sessionId, tenantId, paid: '1' });
    return `${window.location.origin}/pay?${params.toString()}`;
  }, [sessionId, tenantId]);

  useEffect(() => {
    if (searchParams.get('paid') === '1' && sessionId && ep) {
      void waitForSessionPaid(ep, sessionId)
        .then(() => setPaid(true))
        .catch(() => setPaid(true));
    }
  }, [ep, searchParams, sessionId]);

  useEffect(() => {
    if (!sessionId || !tenantId || !ep) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await ep.getPublicPaymentSession(sessionId);
        if (!cancelled) {
          if (data.status === 'paid') setPaid(true);
          else setSession(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load payment.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ep, sessionId, tenantId]);

  if (!sessionId || !tenantId) {
    return (
      <GlassCard title="Invalid link">
        <p className="tms-t2">This payment link is incomplete. Ask temple staff for a new QR code.</p>
      </GlassCard>
    );
  }

  if (paid) {
    return (
      <GlassCard title="Payment received">
        <p className="tms-t2">Thank you — your payment was successful. You can close this page.</p>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard title="Payment unavailable">
        <p className="tms-t2">{error}</p>
      </GlassCard>
    );
  }

  if (!session) {
    return <p className="tms-t2">Loading checkout…</p>;
  }

  return (
    <GlassCard title="Complete payment">
      <p className="tms-t2 mb1">
        <strong>{session.purpose}</strong>
        <br />
        {formatMoney(session.amount, session.currency)}
      </p>
      <StripeCheckoutPanel
        session={session}
        returnUrl={returnUrl}
        preferWallet
        onSuccess={() => setPaid(true)}
        onError={setError}
      />
    </GlassCard>
  );
}

export default function PublicPayPage() {
  return (
    <div className={styles.publicPayPage}>
      <PublicThemeBar />
      <main className={styles.publicPayMain}>
        <Suspense fallback={<p className="tms-t2">Loading…</p>}>
          <PublicPayInner />
        </Suspense>
      </main>
    </div>
  );
}

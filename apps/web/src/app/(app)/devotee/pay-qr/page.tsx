'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, GlassCard } from '@tms/ui';
import type { PaymentSession } from '@tms/types';
import { PageIntro } from '@/components/AppPage';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints, formatMoney } from '@/lib/api/endpoints';

function PayQrPageInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { api } = useTenant();
  const ep = createEndpoints(api);
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await ep.getPaymentSession(sessionId);
        if (!cancelled) setSession(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load payment session.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ep, sessionId]);

  async function simulatePay() {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await ep.confirmPaymentSession(sessionId);
      setSession(updated);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment confirmation failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!sessionId) {
    return (
      <GlassCard>
        <p>Missing payment session. Scan a valid temple payment QR code.</p>
      </GlassCard>
    );
  }

  return (
    <div>
      <PageIntro subtitle="Scan-to-pay landing page for demo QR codes" showTenantContext />

      {error && (
        <GlassCard>
          <p>{error}</p>
        </GlassCard>
      )}

      {session && (
        <GlassCard title="Payment request">
          <p>
            <strong>{session.purpose}</strong>
          </p>
          <p>{formatMoney(session.amount, session.currency)}</p>
          <p>Status: {done || session.status === 'paid' ? 'Paid' : session.status}</p>

          {session.paymentMode !== 'live' && session.status !== 'paid' && !done && (
            <Button variant="primary" className="mt1" onClick={() => void simulatePay()} disabled={busy}>
              {busy ? 'Confirming…' : 'Simulate payment (demo)'}
            </Button>
          )}

          {session.paymentMode === 'live' && session.status !== 'paid' && (
            <p className="tms-t2">Complete payment in your UPI app. This page will not auto-confirm live QR payments.</p>
          )}
        </GlassCard>
      )}
    </div>
  );
}

export default function PayQrPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <PayQrPageInner />
    </Suspense>
  );
}

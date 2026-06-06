'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, GlassCard, PageHeader } from '@tms/ui';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { waitForSessionPaid } from '@/lib/payment-flow';

type ReturnStatus = 'polling' | 'paid' | 'failed' | 'missing';

export default function PaymentReturnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { api } = useTenant();
  const sessionId = searchParams.get('sessionId');
  const [status, setStatus] = useState<ReturnStatus>(sessionId ? 'polling' : 'missing');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    const ep = createEndpoints(api);

    (async () => {
      try {
        await waitForSessionPaid(ep, sessionId);
        if (!cancelled) {
          setStatus('paid');
          setMessage('Payment confirmed. You can close this page or return to the temple app.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('failed');
          setMessage(err instanceof Error ? err.message : 'Payment could not be confirmed');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, sessionId]);

  return (
    <>
      <PageHeader
        title="Payment status"
        subtitle="Confirming your payment with the temple"
      />
      <GlassCard title="Payment return">
        {status === 'missing' && (
          <p className="tms-t2">Missing session id. Return to Book Seva or Donate to try again.</p>
        )}
        {status === 'polling' && (
          <p className="tms-t2">Confirming payment… This may take a few seconds.</p>
        )}
        {status === 'paid' && <p className="tms-t2">{message}</p>}
        {status === 'failed' && <p className="tms-t2">{message}</p>}
        <div className="flexRow mt1">
          <Button variant="primary" onClick={() => router.push('/devotee/home')}>
            Back to home
          </Button>
          <Button variant="outline" onClick={() => router.push('/devotee/donate')}>
            Donate again
          </Button>
        </div>
      </GlassCard>
    </>
  );
}

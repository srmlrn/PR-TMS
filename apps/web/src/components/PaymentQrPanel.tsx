'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@tms/ui';
import type { PaymentSession } from '@tms/types';
import type { Endpoints } from '@/lib/api/endpoints';
import { formatMoney } from '@/lib/api/endpoints';
import { waitForSessionPaid } from '@/lib/payment-flow';
import styles from './live-payment-modal.module.css';

interface Props {
  session: PaymentSession;
  ep: Endpoints;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function PaymentQrPanel({ session, ep, onSuccess, onError }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const isLive = session.paymentMode === 'live';
  const payload = session.qrImageUrl ?? session.qrPayload;

  useEffect(() => {
    if (!payload) {
      onError('QR payload missing from payment session.');
      return;
    }

    if (session.qrImageUrl) {
      setDataUrl(session.qrImageUrl);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) onError('Could not render QR code.');
      });

    return () => {
      cancelled = true;
    };
  }, [payload, session.qrImageUrl, onError]);

  useEffect(() => {
    if (!isLive || !session.providerRefId) return;

    let cancelled = false;
    setPolling(true);

    waitForSessionPaid(ep, session.id)
      .then(() => {
        if (!cancelled) onSuccess();
      })
      .catch((err) => {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : 'QR payment timed out.');
        }
      })
      .finally(() => {
        if (!cancelled) setPolling(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ep, isLive, onError, onSuccess, session.id, session.providerRefId]);

  async function simulateDemoPayment() {
    setBusy(true);
    try {
      await ep.confirmPaymentSession(session.id);
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not confirm demo QR payment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.qrPanel}>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="Payment QR code" className={styles.qrImage} />
      ) : (
        <p className={styles.walletHint}>Generating QR…</p>
      )}

      <p className={styles.walletHint}>
        {isLive
          ? 'Scan with any UPI app. This screen updates when payment is received.'
          : 'Demo QR — scan or use the button below to simulate a successful payment.'}
      </p>

      <p className={styles.qrAmount}>
        {formatMoney(session.amount, session.currency)} · {session.purpose}
      </p>

      {!isLive && (
        <Button variant="primary" fullWidth onClick={() => void simulateDemoPayment()} disabled={busy}>
          {busy ? 'Confirming…' : 'Simulate scan & pay (demo)'}
        </Button>
      )}

      {isLive && polling && (
        <p className={styles.walletHint}>Waiting for UPI payment…</p>
      )}
    </div>
  );
}

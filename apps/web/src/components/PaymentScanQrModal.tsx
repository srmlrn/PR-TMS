'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@tms/ui';
import type { PaymentSession } from '@tms/types';
import type { Endpoints } from '@/lib/api/endpoints';
import { formatMoney } from '@/lib/api/endpoints';
import { buildPayPageUrl } from '@/lib/pay-qr-url';
import { waitForSessionPaid } from '@/lib/payment-flow';
import styles from './live-payment-modal.module.css';

interface Props {
  session: PaymentSession;
  tenantId: string;
  ep: Endpoints;
  walletLabel?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentScanQrModal({
  session,
  tenantId,
  ep,
  walletLabel = 'Apple Pay',
  onSuccess,
  onCancel,
}: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);

  const payUrl = useMemo(
    () => buildPayPageUrl(session.id, tenantId),
    [session.id, tenantId],
  );

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payUrl, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Could not generate QR code.');
      });
    return () => {
      cancelled = true;
    };
  }, [payUrl]);

  useEffect(() => {
    let cancelled = false;
    setWaiting(true);
    waitForSessionPaid(ep, session.id)
      .then(() => {
        if (!cancelled) onSuccess();
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Payment timed out.');
          setWaiting(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ep, onSuccess, session.id]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2 className={styles.title}>Scan to pay with {walletLabel}</h2>
          <p className={styles.subtitle}>
            {session.purpose} · {formatMoney(session.amount, session.currency)}
          </p>
        </header>
        <div className={styles.modalBody}>
          <div className={styles.qrPanel}>
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUrl} alt="Scan to pay QR code" className={styles.qrImage} />
            ) : (
              <p className={styles.walletHint}>Generating QR…</p>
            )}
            <p className={styles.walletHint}>
              Customer scans with iPhone Camera (Apple Pay) or any phone browser. This screen
              closes automatically when payment is received.
            </p>
            {waiting && <p className={styles.walletHint}>Waiting for payment…</p>}
            {error && <p className={styles.error}>{error}</p>}
          </div>
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

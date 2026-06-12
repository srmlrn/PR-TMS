'use client';

import { Button } from '@tms/ui';
import type { TerminalCheckoutStatus } from '@tms/types';
import { formatMoney } from '@/lib/api/endpoints';
import styles from './live-payment-modal.module.css';

interface Props {
  amount: number;
  currency: string;
  status: TerminalCheckoutStatus | null;
  busy: boolean;
  onCancel: () => void;
}

const STATUS_COPY: Record<string, string> = {
  pending: 'Starting Terminal reader…',
  awaiting_card: 'Present, insert, or tap card on the reader',
  processing: 'Processing payment…',
  succeeded: 'Payment approved',
  failed: 'Payment declined',
  cancelled: 'Payment cancelled',
};

export function TerminalPaymentModal({ amount, currency, status, busy, onCancel }: Props) {
  const label = status ? STATUS_COPY[status.status] ?? 'Waiting for reader…' : 'Connecting…';

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="terminal-pay-title">
      <div className={styles.modal}>
        <h2 id="terminal-pay-title" className={styles.title}>
          Card Terminal
        </h2>
        <p className={styles.amount}>{formatMoney(amount, currency)}</p>
        <div className={styles.terminalPanel}>
          <div className={styles.terminalIcon} aria-hidden>
            💳
          </div>
          <p className={styles.terminalStatus}>{label}</p>
          {status?.failureMessage ? (
            <p className={styles.errorText}>{status.failureMessage}</p>
          ) : (
            <p className={styles.hint}>
              Use your Stripe Terminal (WisePOS E, S700, or simulated reader in test mode). Swipe,
              insert chip, or tap contactless — including phone wallets on the reader.
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <Button variant="glass" onClick={onCancel} disabled={busy && status?.status === 'processing'}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

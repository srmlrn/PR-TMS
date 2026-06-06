'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@tms/ui';
import { Currency } from '@tms/types';
import { formatMoney } from '@/lib/api/endpoints';
import styles from './receipt-print.module.css';

export default function ReceiptPrintPage() {
  const router = useRouter();
  const params = useSearchParams();

  const name = params.get('name') ?? 'Guest';
  const amount = Number(params.get('amount') ?? '0');
  const currency = (params.get('currency') as Currency) || Currency.USD;
  const receipt = params.get('receipt') ?? '—';
  const purpose = params.get('purpose') ?? 'Counter — General Hundi';

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={styles.page}>
      <article className={styles.receipt}>
        <header className={styles.header}>
          <span aria-hidden>🛕</span>
          <h1>Sri Venkateswara Temple</h1>
          <p>Donation Receipt</p>
        </header>

        <dl className={styles.details}>
          <div>
            <dt>Devotee</dt>
            <dd>{decodeURIComponent(name)}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formatMoney(amount, currency)}</dd>
          </div>
          <div>
            <dt>Purpose</dt>
            <dd>{decodeURIComponent(purpose)}</dd>
          </div>
          <div>
            <dt>Receipt #</dt>
            <dd>{decodeURIComponent(receipt)}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{new Date().toLocaleString()}</dd>
          </div>
        </dl>

        <p className={styles.footer}>
          Thank you for your generous support. This receipt may be used for tax purposes where applicable.
        </p>
      </article>

      <div className={styles.actions}>
        <Button onClick={() => window.print()}>Print again</Button>
        <Button variant="outline" onClick={() => router.push('/frontdesk/console')}>
          Back to console
        </Button>
      </div>
    </div>
  );
}

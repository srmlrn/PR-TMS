'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { TaxReceipt } from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints, formatMoney } from '@/lib/api/endpoints';
import styles from './receipt.module.css';

type ReceiptType = 'booking' | 'donation';

export default function ReceiptPrintPage() {
  const params = useParams<{ type: string; id: string }>();
  const { api } = useTenant();
  const [receipt, setReceipt] = useState<TaxReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printed, setPrinted] = useState(false);

  const type = params.type as ReceiptType;
  const id = params.id;

  useEffect(() => {
    if (!id || (type !== 'booking' && type !== 'donation')) {
      setError('Invalid receipt link.');
      return;
    }
    const ep = createEndpoints(api);
    const fetcher =
      type === 'booking' ? ep.getBookingReceipt(id) : ep.getDonationReceipt(id);
    fetcher
      .then((data) => {
        setReceipt(data);
      })
      .catch((err: Error) => setError(err.message));
  }, [api, id, type]);

  useEffect(() => {
    if (receipt && !printed) {
      const timer = window.setTimeout(() => {
        window.print();
        setPrinted(true);
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [receipt, printed]);

  if (error) {
    return (
      <div className={styles.page}>
        <p>{error}</p>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className={styles.page}>
        <p>Loading receipt…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <article className={styles.receipt}>
        <header className={styles.header}>
          <h1>{receipt.templeName}</h1>
          <p className={styles.subtitle}>
            {type === 'donation' ? 'Donation Tax Receipt' : 'Seva Booking Receipt'}
          </p>
        </header>

        <dl className={styles.details}>
          <div className={styles.row}>
            <dt>Receipt #</dt>
            <dd>{receipt.receiptNumber}</dd>
          </div>
          <div className={styles.row}>
            <dt>Issued</dt>
            <dd>{new Date(receipt.issuedAt).toLocaleString()}</dd>
          </div>
          <div className={styles.row}>
            <dt>Amount</dt>
            <dd>{formatMoney(receipt.amount, receipt.currency)}</dd>
          </div>
          <div className={styles.row}>
            <dt>Purpose</dt>
            <dd>{receipt.purpose}</dd>
          </div>
          {receipt.taxDocType && (
            <div className={styles.row}>
              <dt>Tax document</dt>
              <dd>{receipt.taxDocType}</dd>
            </div>
          )}
          {receipt.taxId && (
            <div className={styles.row}>
              <dt>Tax ID</dt>
              <dd>{receipt.taxId}</dd>
            </div>
          )}
        </dl>

        <footer className={styles.footer}>
          <p>Thank you for your seva and support.</p>
          <p className={styles.legal}>
            This receipt is issued for your records. Retain for tax purposes where applicable.
          </p>
        </footer>
      </article>

      <div className={styles.noPrint}>
        <button type="button" onClick={() => window.print()}>
          Print again
        </button>
      </div>
    </div>
  );
}

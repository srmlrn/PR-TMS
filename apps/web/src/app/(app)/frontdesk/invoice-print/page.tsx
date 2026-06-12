'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@tms/ui';
import type { CheckoutReceipt, DevoteeProfileInvoice } from '@tms/types';
import { PublicThemeBar } from '@/components/PublicThemeBar';
import { useAuth } from '@/lib/auth-context';
import { createEndpoints, formatMoney, formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useTenantSite } from '@/lib/tenant-site';
import styles from '../receipt-print/receipt-print.module.css';

function InvoicePrintInner() {
  const site = useTenantSite();
  const router = useRouter();
  const params = useSearchParams();
  const { api } = useTenant();
  const { user } = useAuth();
  const ep = useMemo(() => createEndpoints(api), [api]);

  const devoteeId = params.get('devoteeId') ?? '';
  const invoiceId = params.get('invoiceId') ?? '';
  const [invoice, setInvoice] = useState<CheckoutReceipt | DevoteeProfileInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!devoteeId || !invoiceId) return;
    let cancelled = false;

    async function load() {
      try {
        if (invoiceId.startsWith('legacy-')) {
          const profile = await ep.getDevoteeProfile(devoteeId);
          const match = profile.invoices?.find((row) => row.id === invoiceId);
          if (!match) throw new Error('Invoice not found.');
          if (!cancelled) setInvoice(match);
          return;
        }
        const receipt = await ep.getCheckoutReceipt(invoiceId);
        if (!cancelled) setInvoice(receipt);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load invoice.');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [devoteeId, ep, invoiceId]);

  useEffect(() => {
    if (!invoice) return;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [invoice]);

  if (!devoteeId || !invoiceId) {
    return <p className="tms-t2">Missing invoice link.</p>;
  }

  if (error) {
    return <p className="tms-t2">{error}</p>;
  }

  if (!invoice) {
    return <p className="tms-t2">Loading invoice…</p>;
  }

  const devoteeName =
    'devoteeName' in invoice && invoice.devoteeName
      ? invoice.devoteeName
      : user?.name ?? 'Devotee';

  return (
    <div className={styles.page}>
      <PublicThemeBar />
      <article className={styles.receipt}>
        <header className={styles.header}>
          <span aria-hidden>{site.icon}</span>
          <h1>{site.name}</h1>
          <p>Invoice / Receipt</p>
        </header>

        <dl className={styles.details}>
          <div>
            <dt>Devotee</dt>
            <dd>{devoteeName}</dd>
          </div>
          <div>
            <dt>Invoice #</dt>
            <dd>{invoice.receiptNumber}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formatShortDate(invoice.issuedAt)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatMoney(invoice.grandTotal, invoice.currency)}</dd>
          </div>
        </dl>

        <table className={styles.linesTable}>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={`${line.kind}-${line.id}`}>
                <td>{line.description}</td>
                <td>{formatMoney(line.amount, line.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td>
                <strong>{formatMoney(invoice.grandTotal, invoice.currency)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        <p className={styles.footer}>
          Thank you for your generous support. This invoice lists all items from your checkout.
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

export default function InvoicePrintPage() {
  return (
    <Suspense fallback={<p className="tms-t2">Loading…</p>}>
      <InvoicePrintInner />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@tms/ui';
import type { DevoteeProfileInvoice } from '@tms/types';
import type { Endpoints } from '@/lib/api/endpoints';
import { formatMoney } from '@/lib/api/endpoints';
import styles from './InvoiceShareActions.module.css';

interface Props {
  invoice: DevoteeProfileInvoice;
  devoteeId: string;
  devoteeEmail?: string;
  devoteeName?: string;
  ep?: Endpoints;
  onMessage?: (text: string, kind?: 'ok' | 'error') => void;
}

function invoicePrintUrl(devoteeId: string, invoiceId: string): string {
  const params = new URLSearchParams({ devoteeId, invoiceId });
  return `/frontdesk/invoice-print?${params.toString()}`;
}

function invoiceShareText(invoice: DevoteeProfileInvoice, devoteeName?: string): string {
  const lines = invoice.lines
    .map((line) => `• ${line.description} — ${formatMoney(line.amount, line.currency)}`)
    .join('\n');
  return [
    `${devoteeName ?? 'Devotee'} — Invoice #${invoice.receiptNumber}`,
    `Total: ${formatMoney(invoice.grandTotal, invoice.currency)}`,
    '',
    lines,
  ].join('\n');
}

export function InvoiceShareActions({
  invoice,
  devoteeId,
  devoteeEmail,
  devoteeName,
  ep,
  onMessage,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const printUrl = invoicePrintUrl(devoteeId, invoice.id);
  const isPersistedInvoice = !invoice.id.startsWith('legacy-');

  function handlePrint() {
    window.open(printUrl, '_blank', 'noopener,noreferrer');
    setOpen(false);
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}${printUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      onMessage?.('Invoice link copied.');
    } catch {
      onMessage?.('Could not copy link.', 'error');
    }
    setOpen(false);
  }

  async function handleCopySummary() {
    try {
      await navigator.clipboard.writeText(invoiceShareText(invoice, devoteeName));
      onMessage?.('Invoice summary copied.');
    } catch {
      onMessage?.('Could not copy summary.', 'error');
    }
    setOpen(false);
  }

  async function handleNativeShare() {
    const url = `${window.location.origin}${printUrl}`;
    if (typeof navigator.share !== 'function') {
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: `Invoice ${invoice.receiptNumber}`,
        text: invoiceShareText(invoice, devoteeName),
        url,
      });
    } catch {
      /* user cancelled */
    }
    setOpen(false);
  }

  async function handleEmailQueue() {
    if (!ep || !isPersistedInvoice) {
      handleMailto();
      return;
    }
    setBusy(true);
    try {
      const result = await ep.shareCheckoutReceipt(invoice.id, devoteeEmail);
      onMessage?.(result.message);
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : 'Email failed.', 'error');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  function handleMailto() {
    const recipient = devoteeEmail ?? '';
    const subject = encodeURIComponent(`Temple invoice ${invoice.receiptNumber}`);
    const body = encodeURIComponent(`${invoiceShareText(invoice, devoteeName)}\n\nView: ${window.location.origin}${printUrl}`);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    setOpen(false);
  }

  return (
    <div className={styles.wrap}>
      <Button size="sm" variant="outline" onClick={handlePrint}>
        Print
      </Button>
      <div className={styles.menuWrap}>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} disabled={busy}>
          Share
        </Button>
        {open && (
          <div className={styles.menu} role="menu">
            {devoteeEmail && (
              <button type="button" className={styles.menuItem} onClick={() => void handleEmailQueue()}>
                Email {devoteeEmail}
              </button>
            )}
            <button type="button" className={styles.menuItem} onClick={handleMailto}>
              Open in email app
            </button>
            <button type="button" className={styles.menuItem} onClick={() => void handleNativeShare()}>
              Share…
            </button>
            <button type="button" className={styles.menuItem} onClick={() => void handleCopyLink()}>
              Copy link
            </button>
            <button type="button" className={styles.menuItem} onClick={() => void handleCopySummary()}>
              Copy summary
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

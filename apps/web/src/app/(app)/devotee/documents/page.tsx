'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button, GlassCard } from '@tms/ui';
import type { Booking, Donation, DevoteeTaxStatement } from '@tms/types';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import { downloadApiFile } from '@/lib/api/download-file';
import { formatMoney, formatShortDate, formatTime } from '@/lib/api/endpoints';
import styles from './documents.module.css';

type ReceiptFilter = 'all' | 'booking' | 'donation';

const SERVICE_LABELS: Record<string, string> = {
  'svc-archana': 'Archana',
  'svc-abhishekam': 'Abhishekam',
  'svc-homam': 'Homam',
};

const TAX_DOC_LABELS = {
  irs_501c3: 'IRS 501(c)(3) annual giving statement',
  '80g': 'Section 80G / Form 10BE tax letter',
  cra: 'CRA official donation summary',
} as const;

type ReceiptRow = {
  id: string;
  type: 'booking' | 'donation';
  title: string;
  subtitle: string;
  amountLabel: string;
  date: string;
  receiptNumber?: string;
};

export default function DevoteeDocumentsPage() {
  const { user, accessToken } = useAuth();
  const { tenantId, environment } = useTenant();
  const [filter, setFilter] = useState<ReceiptFilter>('all');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [taxDownloading, setTaxDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const taxYear = new Date().getFullYear();

  const devoteeId = user?.devoteeId;

  const { data: bookingsData, loading: bLoading, error: bError } = useApi(
    async (ep) => {
      if (!devoteeId) return { data: [] as Booking[] };
      return ep.getBookings({ devoteeId, limit: 50 });
    },
    [devoteeId],
  );

  const { data: donationsData, loading: dLoading, error: dError } = useApi(
    async (ep) => {
      if (!devoteeId) return { data: [] as Donation[] };
      return ep.getDonations({ devoteeId, limit: 50 });
    },
    [devoteeId],
  );

  const { data: taxStatement, loading: tLoading, error: tError } = useApi(
    async (ep) => {
      if (!devoteeId) return null;
      try {
        return await ep.getDevoteeAnnualTaxStatement(devoteeId, taxYear);
      } catch {
        return null;
      }
    },
    [devoteeId, taxYear],
  );

  const rows = useMemo(() => {
    const bookingRows: ReceiptRow[] = (bookingsData?.data ?? []).map((b) => ({
      id: b.id,
      type: 'booking' as const,
      title: SERVICE_LABELS[b.serviceId] ?? b.serviceId.replace('svc-', ''),
      subtitle: `${formatShortDate(b.scheduledAt)} · ${formatTime(b.scheduledAt)} · ${b.status}`,
      amountLabel: b.amount != null ? formatMoney(b.amount, b.currency) : '—',
      date: typeof b.scheduledAt === 'string' ? b.scheduledAt : new Date(b.scheduledAt).toISOString(),
      receiptNumber: b.receiptNumber,
    }));

    const donationRows: ReceiptRow[] = (donationsData?.data ?? []).map((d) => ({
      id: d.id,
      type: 'donation' as const,
      title: d.purpose,
      subtitle: d.receiptNumber ? `#${d.receiptNumber}` : 'Donation receipt',
      amountLabel: formatMoney(d.amount, d.currency),
      date: typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt).toISOString(),
      receiptNumber: d.receiptNumber,
    }));

    return [...bookingRows, ...donationRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [bookingsData, donationsData]);

  const visibleRows =
    filter === 'all' ? rows : rows.filter((r) => r.type === filter);

  const loading = bLoading || dLoading || tLoading;
  const error = bError ?? dError;

  async function downloadReceiptPdf(row: ReceiptRow) {
    const key = `${row.type}-${row.id}`;
    setDownloading(key);
    setDownloadError(null);
    const path =
      row.type === 'booking'
        ? `/bookings/${row.id}/receipt.pdf`
        : `/donations/${row.id}/receipt.pdf`;
    const filename =
      row.type === 'booking'
        ? `booking-receipt-${row.receiptNumber ?? row.id}.pdf`
        : `donation-receipt-${row.receiptNumber ?? row.id}.pdf`;
    try {
      await downloadApiFile({
        path,
        filename,
        tenantId: user?.tenantId ?? tenantId,
        accessToken: accessToken ?? undefined,
        environment,
      });
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  }

  async function downloadTaxStatement(statement: DevoteeTaxStatement) {
    setTaxDownloading(true);
    setDownloadError(null);
    try {
      await downloadApiFile({
        path: `/donations/devotee/${statement.devoteeId}/annual-statement/file.pdf?year=${statement.year}`,
        filename: `tax-statement-${statement.year}.pdf`,
        tenantId: user?.tenantId ?? tenantId,
        accessToken: accessToken ?? undefined,
        environment,
      });
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setTaxDownloading(false);
    }
  }

  return (
    <>
      <PageIntro
        subtitle="View and download seva receipts and official tax letters from the temple"
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.page}>
        <p className={styles.intro}>
          Individual receipts are available for each booking and donation. Temples also issue annual
          tax letters (IRS 501(c)(3), India 80G, or CRA) summarizing your giving for the year.
        </p>

        {downloadError && (
          <p className="tms-t3" style={{ color: 'var(--red)' }}>
            {downloadError}
          </p>
        )}

        <GlassCard title="Tax letters from the temple">
          {taxStatement ? (
            <div className={styles.taxCard}>
              <div className={styles.taxRow}>
                <div className={styles.taxMain}>
                  <strong>{TAX_DOC_LABELS[taxStatement.taxDocType]}</strong>
                  <p className={styles.taxMeta}>
                    {taxStatement.year} · {formatMoney(taxStatement.totalAmount, taxStatement.currency)}{' '}
                    · {taxStatement.donations.length} line(s) · #{taxStatement.statementNumber}
                  </p>
                </div>
                <div className={styles.taxActions}>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => downloadTaxStatement(taxStatement)}
                    disabled={taxDownloading}
                  >
                    {taxDownloading ? '…' : 'Download PDF'}
                  </Button>
                </div>
              </div>
              <p className={styles.intro}>
                India temples may also provide Form 10BE data export to the accountant — ask the
                temple office if you need PAN-linked 80G documentation.
              </p>
            </div>
          ) : (
            <p className={styles.empty}>
              {tError
                ? 'No annual tax statement available yet. Make a tax-deductible donation to receive one.'
                : 'Loading tax statement…'}
              {' '}
              <Link href="/devotee/donate">Donate</Link>
            </p>
          )}
        </GlassCard>

        <GlassCard title="All receipts">
          <div className={styles.toolbar}>
            {(
              [
                ['all', 'All'],
                ['booking', 'Seva bookings'],
                ['donation', 'Donations'],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? 'primary' : 'outline'}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          {visibleRows.length === 0 ? (
            <p className={styles.empty}>
              No receipts on file. <Link href="/devotee/book">Book seva</Link> or{' '}
              <Link href="/devotee/donate">donate</Link> to get started.
            </p>
          ) : (
            <div className={styles.receiptList}>
              {visibleRows.map((row) => {
                const key = `${row.type}-${row.id}`;
                return (
                  <article key={key} className={styles.receiptRow}>
                    <span className={styles.receiptType}>
                      {row.type === 'booking' ? 'Seva' : 'Donation'}
                    </span>
                    <div className={styles.receiptMain}>
                      <strong>{row.title}</strong>
                      <p className={styles.receiptSub}>{row.subtitle}</p>
                    </div>
                    <span className={styles.receiptAmount}>{row.amountLabel}</span>
                    <div className={styles.receiptActions}>
                      <Link href={`/devotee/receipt/${row.type}/${row.id}`} target="_blank">
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => downloadReceiptPdf(row)}
                        disabled={downloading === key}
                      >
                        {downloading === key ? '…' : 'PDF'}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </>
  );
}

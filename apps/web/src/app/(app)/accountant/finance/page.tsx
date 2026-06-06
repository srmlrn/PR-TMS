'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, DataTable, GlassCard, PageHeader, StatTile, dataTableAmountStyles } from '@tms/ui';
import type { TaxComplianceStatus, VendorPayment } from '@tms/types';
import { createEndpoints, formatMoney, formatShortDate } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { useTenant } from '@/lib/tenant-context';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './finance.module.css';

type VendorStatusFilter = 'all' | VendorPayment['status'];

function downloadTaxCsv(rows: TaxComplianceStatus[]): void {
  const header = ['jurisdiction', 'label', 'ready_count', 'pending_count', 'status'];
  const lines = rows.map((item) => [
    item.jurisdiction,
    `"${item.label.replace(/"/g, '""')}"`,
    String(item.readyCount),
    String(item.pendingCount),
    item.pendingCount === 0 ? 'ready' : 'action_needed',
  ]);
  const csv = [header.join(','), ...lines.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `tax-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AccountantFinancePage() {
  const { api } = useTenant();
  const [statusFilter, setStatusFilter] = useState<VendorStatusFilter>('all');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: summary, loading: sLoading, error: sError } = useApi((ep) =>
    ep.getFinanceSummary(),
  );
  const { data: vendors, loading: vLoading, error: vError } = useApi((ep) =>
    ep.getVendorPayments({ limit: 50 }),
  );
  const { data: tax, loading: tLoading, error: tError } = useApi((ep) =>
    ep.getTaxCompliance(),
  );

  const loading = sLoading || vLoading || tLoading;
  const error = sError ?? vError ?? tError;

  const filteredVendors = useMemo(() => {
    const all = vendors?.data ?? [];
    if (statusFilter === 'all') return all;
    return all.filter((v) => v.status === statusFilter);
  }, [vendors?.data, statusFilter]);

  const vendorRows = filteredVendors.map((v) => ({
    id: v.id,
    vendor: v.vendorName,
    due: formatShortDate(v.dueDate),
    amount: formatMoney(v.amount, v.currency),
    status: v.status,
  }));

  async function handleExportTax() {
    setExporting(true);
    setExportError(null);
    try {
      const ep = createEndpoints(api);
      const rows = tax?.length ? tax : await ep.getTaxCompliance();
      if (!rows.length) {
        setExportError('No tax compliance data to export.');
        return;
      }
      downloadTaxCsv(rows);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Finance Dashboard"
        subtitle="Income, payables, and tax compliance (80G · IRS · CRA)"
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.stats}>
        <StatTile
          label="Income MTD"
          value={formatMoney(summary?.incomeMtd ?? 48200, summary?.currency)}
          icon="📈"
        />
        <StatTile
          label="Expenses MTD"
          value={formatMoney(summary?.expensesMtd ?? 12400, summary?.currency)}
          icon="📉"
        />
        <StatTile
          label="Payables"
          value={formatMoney(summary?.payables ?? 3200, summary?.currency)}
          icon="🧾"
        />
      </div>

      <div className={styles.grid}>
        <GlassCard title="Tax Compliance" className={styles.tax}>
          <div className={styles.taxHeader}>
            <Button size="sm" onClick={handleExportTax} disabled={exporting || tLoading}>
              {exporting ? 'Exporting…' : 'Export tax report (CSV)'}
            </Button>
          </div>
          {exportError && <p className="tms-t3" style={{ color: 'var(--red)' }}>{exportError}</p>}
          {(tax ?? []).map((item) => (
            <div key={item.jurisdiction} className={styles.taxRow}>
              <div>
                <strong>{item.label}</strong>
                <p className="tms-t3">
                  {item.readyCount} ready · {item.pendingCount} pending
                </p>
              </div>
              <Badge variant={item.pendingCount === 0 ? 'ok' : 'pending'}>
                {item.pendingCount === 0 ? 'Ready' : 'Action needed'}
              </Badge>
            </div>
          ))}
        </GlassCard>

        <GlassCard title="Vendor Payments Due" noBodyPadding>
          <div className={styles.vendorToolbar}>
            <label htmlFor="vendorStatus" className="tms-t3">
              Payment status
            </label>
            <select
              id="vendorStatus"
              className={styles.statusSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as VendorStatusFilter)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <DataTable
            getRowKey={(row) => row.id}
            columns={[
              { key: 'vendor', header: 'Vendor', render: (r) => r.vendor },
              { key: 'due', header: 'Due', render: (r) => r.due },
              {
                key: 'amount',
                header: 'Amount',
                align: 'right',
                render: (r) => <span className={dataTableAmountStyles.amber}>{r.amount}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <Badge variant={r.status === 'paid' ? 'ok' : 'pending'}>{r.status}</Badge>
                ),
              },
            ]}
            data={
              vendorRows.length
                ? vendorRows
                : [
                    {
                      id: 'empty',
                      vendor: statusFilter === 'all' ? 'No vendor payments' : `No ${statusFilter} payments`,
                      due: '—',
                      amount: '—',
                      status: 'pending',
                    },
                  ]
            }
          />
        </GlassCard>
      </div>
    </>
  );
}

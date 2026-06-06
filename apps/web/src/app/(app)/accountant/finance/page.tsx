'use client';

import { Badge, DataTable, GlassCard, PageHeader, StatTile, dataTableAmountStyles } from '@tms/ui';
import { formatMoney, formatShortDate } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './finance.module.css';

export default function AccountantFinancePage() {
  const { data: summary, loading: sLoading, error: sError } = useApi((ep) =>
    ep.getFinanceSummary(),
  );
  const { data: vendors, loading: vLoading, error: vError } = useApi((ep) =>
    ep.getVendorPayments({ limit: 10 }),
  );
  const { data: tax, loading: tLoading, error: tError } = useApi((ep) =>
    ep.getTaxCompliance(),
  );

  const loading = sLoading || vLoading || tLoading;
  const error = sError ?? vError ?? tError;

  const vendorRows = (vendors?.data ?? []).map((v) => ({
    id: v.id,
    vendor: v.vendorName,
    due: formatShortDate(v.dueDate),
    amount: formatMoney(v.amount, v.currency),
    status: v.status,
  }));

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
                    { id: '1', vendor: 'Fresh Flowers Co.', due: 'Jun 10', amount: '$450', status: 'pending' },
                  ]
            }
          />
        </GlassCard>
      </div>
    </>
  );
}

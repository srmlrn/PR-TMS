'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, DataTable, GlassCard } from '@tms/ui';
import {
  GANESHA_SEVA_CATALOG,
  ganeshaCatalogSummary,
  type GaneshaCatalogType,
} from '@tms/types';
import { PageIntro } from '@/components/AppPage';
import { formatMoney } from '@/lib/api/endpoints';

const TYPE_VARIANT: Record<GaneshaCatalogType, 'ok' | 'pending' | 'info' | 'error'> = {
  seva: 'ok',
  donation: 'pending',
  rental: 'info',
  membership: 'info',
  fee: 'error',
  event: 'pending',
  sales: 'ok',
  other: 'info',
};

export default function SevaCatalogReferencePage() {
  const [typeFilter, setTypeFilter] = useState<GaneshaCatalogType | ''>('');
  const [search, setSearch] = useState('');

  const summary = useMemo(() => ganeshaCatalogSummary(), []);

  const rows = useMemo(() => {
    let list = [...GANESHA_SEVA_CATALOG];
    if (typeFilter) list = list.filter((item) => item.type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }
    return list;
  }, [typeFilter, search]);

  return (
    <div className="pageShell">
      <PageIntro
        subtitle="269 categories from Sri Ganesha Temple reports — matches legacy front-desk category dropdown"
        actions={
          <Link href="/admin/settings/catalog/services">
            <Button variant="glass" size="sm">
              ← Seva catalog (bookable)
            </Button>
          </Link>
        }
        showTenantContext={false}
      />

      <div className="statGrid mb2">
        {summary.map((row) => (
          <GlassCard key={row.type} compact title={row.type}>
            <p className="tms-t1" style={{ margin: 0, fontWeight: 800 }}>
              {row.count}
            </p>
          </GlassCard>
        ))}
      </div>

      <GlassCard
        title={`Category reference (${rows.length})`}
        compact
        noBodyPadding
        headerRight={
          <div className="flexRow">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search catalog"
              style={{ minWidth: '12rem' }}
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as GaneshaCatalogType | '')}
              aria-label="Filter by type"
            >
              <option value="">All types</option>
              {summary.map((row) => (
                <option key={row.type} value={row.type}>
                  {row.type} ({row.count})
                </option>
              ))}
            </select>
          </div>
        }
      >
        <DataTable
          getRowKey={(r) => String(r.id)}
          data={rows}
          columns={[
            { key: 'id', header: '#', render: (r) => r.id },
            { key: 'name', header: 'Name', render: (r) => r.name },
            {
              key: 'price',
              header: 'Price',
              render: (r) =>
                r.priceUsd != null ? formatMoney(r.priceUsd) : <span className="hint">Variable</span>,
            },
            {
              key: 'type',
              header: 'Type',
              render: (r) => <Badge variant={TYPE_VARIANT[r.type]}>{r.type}</Badge>,
            },
          ]}
        />
      </GlassCard>

      <p className="hint">
        Source: <code>docs/SRI_GANESHA_TEMPLE_SEVA_CATALOG.md</code>. Rows with type{' '}
        <strong>seva</strong> are synced into the bookable seva catalog for Sri Ganesha Temple.
        Donations and memberships appear in counter POS donation funds.
      </p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  GlassCard,
  PageHeader,
  StatTile,
} from '@tms/ui';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './devotees.module.css';

const FALLBACK = [
  {
    id: '1',
    name: 'Rajan Krishnamurthy',
    phone: '+1 408-555-0101',
    gotram: 'Bharadwaja',
    tier: 'Gold',
    status: 'active' as const,
  },
  {
    id: '2',
    name: 'Priya Sharma',
    phone: '+1 408-555-0102',
    gotram: 'Kashyapa',
    tier: 'Silver',
    status: 'active' as const,
  },
];

export default function DevoteesPage() {
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useApi(
    (ep) => ep.getDevotees({ limit: 50, name: search || undefined }),
    [search],
  );

  const rows =
    data?.data && !error
      ? data.data.map((d) => ({
          id: d.id,
          name: `${d.firstName} ${d.lastName}`,
          phone: d.phone,
          gotram: d.gotram ?? '—',
          tier: d.membershipTier ?? 'Member',
          status: d.status,
        }))
      : FALLBACK;

  return (
    <>
      <PageHeader
        title="Devotee CRM"
        subtitle="Member profiles, gotram, nakshatra, and engagement history"
        actions={<Button onClick={() => refetch()}>Refresh</Button>}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={`${styles.stats} mb2`}>
        <StatTile label="Total Members" value={String(data?.meta.total ?? rows.length)} icon="👥" />
        <StatTile label="Active" value={String(rows.filter((r) => r.status === 'active').length)} icon="✅" />
        <StatTile label="Renewal Due" value="3" icon="📅" change="This month" />
      </div>

      <GlassCard
        title="Devotee Directory"
        headerRight={
          <input
            className={styles.search}
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
        noBodyPadding
      >
        <DataTable
          getRowKey={(row) => row.id}
          columns={[
            { key: 'name', header: 'Name', render: (row) => row.name },
            { key: 'phone', header: 'Phone', render: (row) => row.phone },
            { key: 'gotram', header: 'Gotram', render: (row) => row.gotram },
            { key: 'tier', header: 'Tier', render: (row) => row.tier },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <Badge variant={row.status === 'active' ? 'ok' : 'pending'}>
                  {row.status}
                </Badge>
              ),
            },
          ]}
          data={rows}
        />
      </GlassCard>
    </>
  );
}

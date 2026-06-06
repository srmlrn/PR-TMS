'use client';

import { Badge, DataTable, GlassCard, PageHeader, StatTile } from '@tms/ui';
import { BookingStatus } from '@tms/types';
import { formatMoney, formatTime } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './schedule.module.css';

const SERVICE_LABELS: Record<string, string> = {
  'svc-archana': 'Archana',
  'svc-abhishekam': 'Abhishekam',
  'svc-homam': 'Homam',
};

export default function PriestSchedulePage() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, loading, error } = useApi((ep) =>
    ep.getBookings({ limit: 20, date: today }),
  );

  const bookings = data?.data ?? [];
  const confirmed = bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length;

  const rows = bookings.map((b) => ({
    id: b.id,
    time: formatTime(b.scheduledAt),
    service: SERVICE_LABELS[b.serviceId] ?? b.serviceId,
    status: b.status,
    amount: formatMoney(b.amount, b.currency),
    channel: b.channel,
  }));

  return (
    <>
      <PageHeader
        title="Today's Schedule"
        subtitle={`Assigned poojas and archana for ${new Date().toLocaleDateString()}`}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.stats}>
        <StatTile label="Today's Sevas" value={String(bookings.length)} icon="📿" />
        <StatTile label="Confirmed" value={String(confirmed)} icon="✅" />
        <StatTile label="Honorarium (est.)" value="$420" icon="💰" change="Today" />
      </div>

      <GlassCard title="Pooja Schedule" noBodyPadding>
        <DataTable
          getRowKey={(row) => row.id}
          columns={[
            { key: 'time', header: 'Time', render: (r) => r.time },
            { key: 'service', header: 'Service', render: (r) => r.service },
            { key: 'channel', header: 'Channel', render: (r) => r.channel },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <Badge variant={r.status === 'confirmed' ? 'ok' : 'pending'}>{r.status}</Badge>
              ),
            },
            { key: 'amount', header: 'Dakshina', render: (r) => r.amount, align: 'right' },
          ]}
          data={rows.length ? rows : [
            { id: '1', time: '9:00 AM', service: 'Archana', status: 'confirmed', amount: '$51', channel: 'app' },
            { id: '2', time: '11:00 AM', service: 'Abhishekam', status: 'pending', amount: '$151', channel: 'counter' },
          ]}
        />
      </GlassCard>
    </>
  );
}

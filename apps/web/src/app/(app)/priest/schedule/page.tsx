'use client';

import { Badge, DataTable, GlassCard, PageHeader, StatTile } from '@tms/ui';
import { Booking, BookingStatus, Devotee } from '@tms/types';
import { formatMoney, formatTime } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './schedule.module.css';

const SERVICE_LABELS: Record<string, string> = {
  'svc-archana': 'Archana',
  'svc-abhishekam': 'Abhishekam',
  'svc-homam': 'Homam',
};

interface ScheduleRow {
  id: string;
  time: string;
  service: string;
  devotee: string;
  sankalpa: string;
  status: string;
  amount: string;
  channel: string;
}

function buildSankalpaLabel(booking: Booking): string {
  const s = booking.sankalpa;
  if (!s) return '—';
  const parts = [
    s.sponsorName,
    s.gotram ? `Gotram: ${s.gotram}` : null,
    s.nakshatra ? `Nakshatra: ${s.nakshatra}` : null,
    s.occasion ? `Occasion: ${s.occasion}` : null,
    s.beneficiaryName ? `For: ${s.beneficiaryName}` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

function devoteeName(devotees: Devotee[] | undefined, devoteeId: string): string {
  const d = devotees?.find((x) => x.id === devoteeId);
  return d ? `${d.firstName} ${d.lastName}` : devoteeId.slice(0, 8);
}

export default function PriestSchedulePage() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, loading, error } = useApi((ep) =>
    Promise.all([
      ep.getBookings({ limit: 20, date: today }),
      ep.getDevotees({ limit: 100 }),
    ]).then(([bookings, devotees]) => ({ bookings, devotees })),
  );

  const bookings = data?.bookings?.data ?? [];
  const devotees = data?.devotees?.data;
  const confirmed = bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length;

  const rows: ScheduleRow[] = bookings.map((b) => ({
    id: b.id,
    time: formatTime(b.scheduledAt),
    service: SERVICE_LABELS[b.serviceId] ?? b.serviceId,
    devotee: devoteeName(devotees, b.devoteeId),
    sankalpa: buildSankalpaLabel(b),
    status: b.status,
    amount: formatMoney(b.amount, b.currency),
    channel: b.channel,
  }));

  return (
    <>
      <PageHeader
        title="Today's Schedule"
        subtitle={`Pooja list with devotee name and sankalpa for ritual recital — ${new Date().toLocaleDateString()}`}
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
            { key: 'devotee', header: 'Devotee', render: (r) => r.devotee },
            { key: 'sankalpa', header: 'Sankalpa', render: (r) => r.sankalpa },
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
          data={
            rows.length
              ? rows
              : [
                  {
                    id: '1',
                    time: '9:00 AM',
                    service: 'Archana',
                    devotee: 'Rajan Krishnamurthy',
                    sankalpa: 'Rajan K · Gotram: Bharadwaja · Nakshatra: Rohini',
                    status: 'confirmed',
                    amount: '$51',
                    channel: 'app',
                  },
                ]
          }
        />
      </GlassCard>
    </>
  );
}

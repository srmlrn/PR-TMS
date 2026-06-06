'use client';

import { useState } from 'react';
import { Badge, Button, DataTable, GlassCard, PageHeader, StatTile } from '@tms/ui';
import { Booking, BookingStatus, Devotee } from '@tms/types';
import { formatMoney, formatTime } from '@/lib/api/endpoints';
import { createEndpoints } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
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
  const { api } = useTenant();
  const [completing, setCompleting] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const { data, loading, error, refetch } = useApi((ep) =>
    Promise.all([
      ep.getBookings({ limit: 20, date: today }),
      ep.getDevotees({ limit: 100 }),
      ep.getHonorarium(today),
    ]).then(([bookings, devotees, honorarium]) => ({
      bookings,
      devotees,
      honorarium,
    })),
  );

  const bookings = data?.bookings?.data ?? [];
  const devotees = data?.devotees?.data;
  const confirmed = bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length;
  const honorariumTotal = data?.honorarium?.total ?? 0;

  async function markComplete(id: string) {
    setCompleting(id);
    try {
      const ep = createEndpoints(api);
      await ep.updateBookingStatus(id, BookingStatus.COMPLETED);
      refetch();
    } finally {
      setCompleting(null);
    }
  }

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
        subtitle={`Pooja list with devotee name and sankalpa — ${new Date().toLocaleDateString()}`}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.stats}>
        <StatTile label="Today's Sevas" value={String(bookings.length)} icon="📿" />
        <StatTile label="Confirmed" value={String(confirmed)} icon="✅" />
        <StatTile
          label="Honorarium (completed)"
          value={formatMoney(honorariumTotal)}
          icon="💰"
          change="Today"
        />
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
                <Badge variant={r.status === 'completed' ? 'ok' : 'pending'}>{r.status}</Badge>
              ),
            },
            { key: 'amount', header: 'Dakshina', render: (r) => r.amount, align: 'right' },
            {
              key: 'action',
              header: '',
              render: (r) =>
                r.status === BookingStatus.CONFIRMED ? (
                  <Button
                    variant="outline"
                    onClick={() => markComplete(r.id)}
                    disabled={completing === r.id}
                  >
                    {completing === r.id ? '…' : 'Complete'}
                  </Button>
                ) : null,
            },
          ]}
          data={rows}
        />
      </GlassCard>
    </>
  );
}

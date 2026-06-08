'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, DataTable, GlassCard, StatTile } from '@tms/ui';
import { PageIntro } from '@/components/AppPage';
import { Booking, BookingStatus, Devotee, Staff } from '@tms/types';
import { formatMoney, formatTime } from '@/lib/api/endpoints';
import { createEndpoints } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';

const SERVICE_LABELS: Record<string, string> = {
  'svc-archana': 'Archana',
  'svc-abhishekam': 'Abhishekam',
  'svc-homam': 'Homam',
};

/** Fallback when staff API is unavailable */
const FALLBACK_PRIESTS = [
  { id: 'user-priest-001', name: 'Sri Raman' },
  { id: 'user-priest-002', name: 'Swami Venkat' },
  { id: 'user-priest-003', name: 'Swami Ramanujan' },
];

function priestLabel(priestId: string | undefined, priests: Pick<Staff, 'id' | 'name'>[]): string {
  if (!priestId) return 'Unassigned';
  return priests.find((p) => p.id === priestId)?.name ?? priestId.slice(0, 8);
}

interface ScheduleRow {
  id: string;
  time: string;
  service: string;
  devotee: string;
  sankalpa: string;
  status: string;
  amount: string;
  channel: string;
  priestId?: string;
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
    s.priestPreference ? `Priest pref: ${s.priestPreference}` : null,
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
  const [assigning, setAssigning] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const { data, loading, error, refetch } = useApi((ep) =>
    Promise.all([
      ep.getBookings({ limit: 20, date: today }),
      ep.getDevotees({ limit: 100 }),
      ep.getHonorarium(today),
      ep.getStaff({ role: 'priest' }),
    ]).then(([bookings, devotees, honorarium, staff]) => ({
      bookings,
      devotees,
      honorarium,
      priests: staff.data,
    })),
  );

  const bookings = data?.bookings?.data ?? [];
  const devotees = data?.devotees?.data;
  const priests: Pick<Staff, 'id' | 'name' | 'onLeaveToday'>[] = data?.priests?.length
    ? data.priests
    : FALLBACK_PRIESTS;
  const confirmed = bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length;
  const honorariumTotal = data?.honorarium?.total ?? 0;
  const honorariumCurrency = data?.honorarium?.currency ?? 'USD';

  async function markComplete(id: string) {
    setCompleting(id);
    setCompleteError(null);
    try {
      const ep = createEndpoints(api);
      await ep.updateBookingStatus(id, BookingStatus.COMPLETED);
      await refetch();
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Could not mark seva complete');
    } finally {
      setCompleting(null);
    }
  }

  async function assignPriest(bookingId: string, priestId: string) {
    setAssigning(bookingId);
    setAssignError(null);
    try {
      const ep = createEndpoints(api);
      await ep.updateBooking(bookingId, {
        priestId: priestId || undefined,
      });
      await refetch();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Could not assign priest');
    } finally {
      setAssigning(null);
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
    priestId: b.priestId,
  }));

  return (
    <div className="pageShell">
      <PageIntro
        subtitle={`Pooja list with devotee name and sankalpa — ${new Date().toLocaleDateString()}`}
        actions={
          <Link href="/priest/leave">
            <Button size="sm" variant="outline">
              My Leave
            </Button>
          </Link>
        }
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className="statGrid mb2">
        <StatTile label="Today's Sevas" value={String(bookings.length)} icon="📿" />
        <StatTile label="Confirmed" value={String(confirmed)} icon="✅" />
        <StatTile
          label="Honorarium (completed)"
          value={formatMoney(honorariumTotal, honorariumCurrency)}
          icon="💰"
          change="Live from API"
        />
      </div>

      {(completeError || assignError) && (
        <p className="tms-t2 mb1" style={{ color: 'var(--red)' }}>
          {completeError ?? assignError}
        </p>
      )}

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
              key: 'priest',
              header: 'Priest',
              render: (r) => (
                <select
                  className="priestSelect"
                  value={r.priestId ?? ''}
                  disabled={assigning === r.id || r.status === BookingStatus.COMPLETED}
                  onChange={(e) => assignPriest(r.id, e.target.value)}
                  aria-label={`Assign priest for ${r.service} at ${r.time}`}
                >
                  <option value="">Unassigned</option>
                  {priests.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.onLeaveToday}>
                      {p.name}
                      {p.onLeaveToday ? ' (on leave)' : ''}
                    </option>
                  ))}
                  {r.priestId &&
                    !priests.some((p) => p.id === r.priestId) && (
                      <option value={r.priestId}>{priestLabel(r.priestId, priests)}</option>
                    )}
                </select>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <Badge variant={r.status === BookingStatus.COMPLETED ? 'ok' : 'pending'}>
                  {r.status}
                </Badge>
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
    </div>
  );
}

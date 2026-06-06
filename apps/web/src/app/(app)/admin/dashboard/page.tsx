'use client';

import {
  Badge,
  BentoGrid,
  BentoItem,
  Button,
  Chip,
  DataTable,
  GlassCard,
  PageHeader,
  StatTile,
  dataTableAmountStyles,
} from '@tms/ui';
import { BookingStatus } from '@tms/types';
import { formatMoney, formatTime } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import styles from './dashboard.module.css';

const WEEKLY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BAR_HEIGHTS = [55, 70, 80, 100, 120, 90, 105];

interface RecentBooking {
  id: string;
  time: string;
  service: string;
  devotee: string;
  priest: string;
  channel: string;
  channelVariant: 'amber' | 'blue';
  amount: string;
  amountTone: keyof typeof dataTableAmountStyles;
  status: 'ok' | 'pending';
  statusLabel: string;
}

const FALLBACK_BOOKINGS: RecentBooking[] = [
  {
    id: '1',
    time: '9:00',
    service: 'Archana',
    devotee: 'Rajan K.',
    priest: 'Swami Ramanujan',
    channel: 'App',
    channelVariant: 'blue',
    amount: '$20',
    amountTone: 'green',
    status: 'ok',
    statusLabel: 'Confirmed',
  },
  {
    id: '2',
    time: '9:30',
    service: 'Abhishekam',
    devotee: 'S. Patel',
    priest: 'Swami Venkat',
    channel: 'Counter',
    channelVariant: 'amber',
    amount: '$101',
    amountTone: 'green',
    status: 'ok',
    statusLabel: 'Confirmed',
  },
  {
    id: '3',
    time: '11:00',
    service: 'Homam',
    devotee: 'M. Reddy',
    priest: '—',
    channel: 'Online',
    channelVariant: 'amber',
    amount: '$251',
    amountTone: 'amber',
    status: 'pending',
    statusLabel: 'Pending pay',
  },
];

const SERVICE_LABELS: Record<string, string> = {
  'svc-archana': 'Archana',
  'svc-abhishekam': 'Abhishekam',
  'svc-homam': 'Homam',
};

const CHANNEL_LABELS: Record<string, { label: string; variant: 'amber' | 'blue' }> = {
  app: { label: 'App', variant: 'blue' },
  counter: { label: 'Counter', variant: 'amber' },
  online: { label: 'Online', variant: 'amber' },
  kiosk: { label: 'Kiosk', variant: 'amber' },
};

function Sparkline({ color }: { color: string }) {
  return (
    <svg className={styles.sparkline} viewBox="0 0 120 32" preserveAspectRatio="none">
      <polyline
        points="0,28 20,22 40,24 60,12 80,16 100,6 120,8"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ApiBanner({ loading, error }: { loading: boolean; error: string | null }) {
  if (!loading && !error) return null;
  return (
    <div className={styles.apiBanner}>
      {loading && 'Loading live data…'}
      {!loading && error && `Using demo data — ${error}`}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, loading, error } = useApi((ep) =>
    Promise.all([
      ep.getDashboardAnalytics(),
      ep.getBookings({ limit: 10 }),
    ]).then(([analytics, bookings]) => ({ analytics, bookings })),
  );

  const analytics = data?.analytics;
  const donationsMtdValue = analytics
    ? formatMoney(analytics.donationsMtd.total, analytics.donationsMtd.currency)
    : '$9,820';
  const devoteesCount = analytics?.devotees ?? 1480;
  const bookingsCount = analytics?.bookingsToday ?? 52;
  const queueInLine = analytics?.queue.inQueue ?? 53;
  const queueServed = analytics?.queue.servedToday ?? 312;

  const recentBookings: RecentBooking[] =
    data?.bookings?.data.length && !error
      ? data.bookings.data.map((b) => {
          const channel = CHANNEL_LABELS[b.channel] ?? { label: b.channel, variant: 'amber' as const };
          const isPending = b.status === BookingStatus.PENDING;
          return {
            id: b.id,
            time: formatTime(b.scheduledAt),
            service: SERVICE_LABELS[b.serviceId] ?? b.serviceId.replace('svc-', ''),
            devotee: b.sankalpa?.sponsorName ?? b.devoteeId.slice(0, 12),
            priest: b.priestId ?? '—',
            channel: channel.label,
            channelVariant: channel.variant,
            amount: formatMoney(b.amount, b.currency),
            amountTone: isPending ? 'amber' : 'green',
            status: isPending ? 'pending' : 'ok',
            statusLabel: isPending ? 'Pending pay' : 'Confirmed',
          };
        })
      : FALLBACK_BOOKINGS;

  return (
    <>
      <PageHeader
        title="Temple Dashboard"
        subtitle="Sri Venkateswara Temple, Fremont CA · Real-time"
        actions={
          <>
            <Button size="sm">Today</Button>
            <Button size="sm">This Month ▾</Button>
          </>
        }
      />

      <ApiBanner loading={loading} error={error} />

      <BentoGrid className="mb2">
        <BentoItem span={3}>
          <StatTile
            icon="💰"
            label="Donations MTD"
            value={donationsMtdValue}
            change={
              analytics
                ? `${analytics.donationsMtd.count} gifts this month`
                : '↑ 14% vs last month'
            }
            changeTone="up"
            accent="amber"
            sparkline={<Sparkline color="rgba(245,166,35,.5)" />}
          />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile
            icon="📅"
            label="Bookings Today"
            value={String(bookingsCount)}
            change={analytics ? 'Scheduled seva for today' : '38 seva · 14 darshan'}
            changeTone="neutral"
            accent="green"
            sparkline={<Sparkline color="rgba(15,185,129,.5)" />}
          />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile
            icon="👥"
            label="Devotees"
            value={String(devoteesCount)}
            change="Active CRM profiles"
            changeTone="up"
            accent="blue"
            sparkline={<Sparkline color="rgba(95,164,249,.5)" />}
          />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile
            icon="🎫"
            label="Queue"
            value={String(queueInLine)}
            change={
              analytics
                ? `${queueServed} served · ~${analytics.queue.averageWaitMinutes} min avg wait`
                : 'Low prasadam stock'
            }
            changeTone="neutral"
            accent="red"
          />
        </BentoItem>
      </BentoGrid>

      <BentoGrid className="mb2">
        <BentoItem span={7}>
          <GlassCard title="Weekly Collections" headerRight={<span className="tms-t3">Mon–Sun</span>}>
            <svg className={styles.barChart} viewBox="0 0 400 140" width="100%" height="140">
              <defs>
                <linearGradient id="bar-g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="var(--amber)" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              {[20, 60, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="400"
                  y2={y}
                  stroke="rgba(255,255,255,.05)"
                  strokeWidth="1"
                />
              ))}
              {BAR_HEIGHTS.map((h, i) => (
                <rect
                  key={WEEKLY_LABELS[i]}
                  x={10 + i * 60}
                  y={140 - h}
                  width={i === 6 ? 32 : 44}
                  height={h}
                  rx="5"
                  fill="url(#bar-g)"
                  opacity={0.6 + i * 0.05}
                />
              ))}
              {WEEKLY_LABELS.map((label, i) => (
                <text
                  key={label}
                  x={32 + i * 60}
                  y="135"
                  textAnchor="middle"
                  fill={label === 'Fri' ? 'rgba(245,166,35,.8)' : 'rgba(255,255,255,.35)'}
                  fontSize="11"
                  fontWeight={label === 'Fri' ? 700 : 400}
                >
                  {label}
                </text>
              ))}
            </svg>
          </GlassCard>
        </BentoItem>
        <BentoItem span={5}>
          <GlassCard title="Collection Breakdown">
            <div className={styles.donutRow}>
              <svg viewBox="0 0 130 130" width="130" height="130">
                <circle cx="65" cy="65" r="50" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="16" />
                <circle
                  cx="65"
                  cy="65"
                  r="50"
                  fill="none"
                  stroke="var(--amber)"
                  strokeWidth="16"
                  strokeDasharray="148 166"
                  strokeLinecap="round"
                  transform="rotate(-90 65 65)"
                />
                <circle
                  cx="65"
                  cy="65"
                  r="50"
                  fill="none"
                  stroke="var(--gr)"
                  strokeWidth="16"
                  strokeDasharray="104 210"
                  strokeDashoffset="-152"
                  strokeLinecap="round"
                  transform="rotate(-90 65 65)"
                />
                <circle
                  cx="65"
                  cy="65"
                  r="50"
                  fill="none"
                  stroke="var(--bl)"
                  strokeWidth="16"
                  strokeDasharray="63 251"
                  strokeDashoffset="-256"
                  strokeLinecap="round"
                  transform="rotate(-90 65 65)"
                />
                <text x="65" y="61" textAnchor="middle" fill="white" fontSize="16" fontWeight="800">
                  $9.8k
                </text>
                <text x="65" y="76" textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="9">
                  TODAY
                </text>
              </svg>
              <div className={styles.donutLegend}>
                <div className="flexRow">
                  <span className={styles.legendDot} style={{ background: 'var(--amber)' }} />
                  <span className="tms-t2">Online / App — 47%</span>
                </div>
                <div className="flexRow">
                  <span className={styles.legendDot} style={{ background: 'var(--gr)' }} />
                  <span className="tms-t2">POS / Counter — 33%</span>
                </div>
                <div className="flexRow">
                  <span className={styles.legendDot} style={{ background: 'var(--bl)' }} />
                  <span className="tms-t2">Kiosk — 20%</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </BentoItem>
      </BentoGrid>

      <GlassCard title="Recent Bookings" headerRight={<Button size="sm">View all</Button>} noBodyPadding>
        <DataTable
          columns={[
            { key: 'time', header: 'Time', render: (r) => r.time },
            { key: 'service', header: 'Service', render: (r) => r.service },
            { key: 'devotee', header: 'Devotee', render: (r) => r.devotee },
            { key: 'priest', header: 'Priest', render: (r) => r.priest },
            {
              key: 'channel',
              header: 'Channel',
              render: (r) => <Chip variant={r.channelVariant}>{r.channel}</Chip>,
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (r) => (
                <span className={dataTableAmountStyles[r.amountTone]}>{r.amount}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <Badge variant={r.status}>{r.statusLabel}</Badge>,
            },
          ]}
          data={recentBookings}
          getRowKey={(r) => r.id}
        />
      </GlassCard>
    </>
  );
}

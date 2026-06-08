'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BentoGrid,
  BentoItem,
  Button,
  Chip,
  DataTable,
  GlassCard,
  PageHeader,
  StatTile,
} from '@tms/ui';
import type { Booking, Devotee, Donation, SevaSubscription } from '@tms/types';
import { BookingStatus } from '@tms/types';
import { formatMoney, formatShortDate, formatTime } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth-context';
import { useTenantSite } from '@/lib/tenant-site';
import { useApi } from '@/lib/api/use-api';
import styles from './home.module.css';

const SERVICE_LABELS: Record<string, string> = {
  'svc-archana': 'Archana',
  'svc-abhishekam': 'Abhishekam',
  'svc-homam': 'Homam',
};

function ApiBanner({ loading, error }: { loading: boolean; error: string | null }) {
  if (!loading && !error) return null;
  return (
    <div className="apiBanner">
      {loading && 'Loading live data…'}
      {!loading && error && `Using demo data — ${error}`}
    </div>
  );
}

export default function DevoteeHomePage() {
  const { user } = useAuth();
  const site = useTenantSite();
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');

  type HomeData = {
    devotee: Devotee | null;
    bookings: { data: Booking[] };
    recentDonations: Donation[];
    donationsUnavailable: boolean;
    sevaSubscriptions: SevaSubscription[];
  };

  const emptyHome: HomeData = {
    devotee: null,
    bookings: { data: [] },
    recentDonations: [],
    donationsUnavailable: false,
    sevaSubscriptions: [],
  };

  const { data, loading, error } = useApi<HomeData>(
    async (ep) => {
      if (!user?.devoteeId) {
        return emptyHome;
      }
      const [devotee, bookings, donations, sevaSubscriptions] = await Promise.all([
        ep.getDevotee(user.devoteeId),
        ep.getBookings({ devoteeId: user.devoteeId, limit: 5 }),
        ep.getDonations({ devoteeId: user.devoteeId, limit: 5 }).catch(
          () => ({ data: [] as Donation[], meta: { total: 0, page: 1, limit: 5, totalPages: 0 } }),
        ),
        ep.getSevaSubscriptions({ devoteeId: user.devoteeId, status: 'active' }).catch(
          () => ({ data: [] as SevaSubscription[] }),
        ),
      ]);
      return {
        devotee,
        bookings,
        recentDonations: donations.data,
        donationsUnavailable: donations.data.length === 0,
        sevaSubscriptions: sevaSubscriptions.data,
      };
    },
    [user?.devoteeId],
  );

  const devotee = data?.devotee;
  const recentBookings = data?.bookings?.data ?? [];
  const activeSevaSubs = data?.sevaSubscriptions ?? [];
  const nextBooking = recentBookings.find(
    (b: Booking) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING,
  );

  const welcomeName = devotee ? `${devotee.firstName}` : 'Rajan';
  const nakshatra = devotee?.nakshatra ?? 'Rohini';
  const ytdDonations = devotee?.ytdDonations
    ? formatMoney(devotee.ytdDonations.amount, devotee.ytdDonations.currency)
    : '$1,850';
  const membership = devotee?.membershipTier ?? 'Patron';
  const membershipRenewal = devotee?.membershipExpiresAt
    ? `Renews ${formatShortDate(devotee.membershipExpiresAt)}`
    : 'Renews Dec 2026';

  const bookingService = nextBooking
    ? SERVICE_LABELS[nextBooking.serviceId] ?? nextBooking.serviceId.replace('svc-', '')
    : 'Archana';
  const bookingDate = nextBooking
    ? `${formatShortDate(nextBooking.scheduledAt)} · ${formatTime(nextBooking.scheduledAt)}`
    : '7 Jun · 9:00 AM';
  const bookingLabel = nextBooking
    ? `${bookingService} · ${formatShortDate(nextBooking.scheduledAt)}`
    : 'Archana · 7 Jun';
  const bookingStatus =
    nextBooking?.status === BookingStatus.CONFIRMED ? 'Confirmed' : 'Pending';

  return (
    <>
      <PageHeader
        title={`Welcome back, ${welcomeName} 🙏`}
        subtitle={
          <>
            ⭐ Star day today: <strong style={{ color: 'var(--amber)' }}>{nakshatra} Nakshatra</strong> ·
            Friday, Jun 6, 2026
          </>
        }
        actions={
          <div className="flexRow">
            <Button size="sm" variant={view === 'desktop' ? 'primary' : 'glass'} onClick={() => setView('desktop')}>
              🖥 Desktop
            </Button>
            <Button size="sm" variant={view === 'mobile' ? 'primary' : 'glass'} onClick={() => setView('mobile')}>
              📱 Mobile
            </Button>
          </div>
        }
      />

      <ApiBanner loading={loading} error={error} />

      {view === 'desktop' ? (
        <>
          <BentoGrid className="mb2">
            <BentoItem span={3}>
              <StatTile
                icon="📅"
                label="Next Booking"
                value={bookingLabel}
                valueSize="sm"
                change={`${bookingDate.split('·')[1]?.trim() ?? '9:00 AM'} · ${bookingStatus}`}
                changeTone="neutral"
                accent="amber"
              />
            </BentoItem>
            <BentoItem span={3}>
              <StatTile
                icon="💰"
                label="YTD Donations"
                value={ytdDonations}
                change="↑ IRS statement ready"
                changeTone="up"
                accent="green"
              />
            </BentoItem>
            <BentoItem span={3}>
              <StatTile
                icon="🏅"
                label="Membership"
                value={membership}
                valueSize="sm"
                change={membershipRenewal}
                changeTone="neutral"
                accent="blue"
              />
            </BentoItem>
            <BentoItem span={3}>
              <StatTile
                icon="📺"
                label="Live Now"
                value="Evening Aarti"
                valueSize="sm"
                change="● 418 watching"
                changeTone="up"
                accent="red"
              />
            </BentoItem>
          </BentoGrid>

          <BentoGrid className="mb2">
            <BentoItem span={6}>
              <GlassCard title="Recent Bookings" noBodyPadding>
                {recentBookings.length > 0 ? (
                  <DataTable
                    getRowKey={(row) => row.id}
                    columns={[
                      {
                        key: 'service',
                        header: 'Seva',
                        render: (row) =>
                          SERVICE_LABELS[row.serviceId] ?? row.serviceId.replace('svc-', ''),
                      },
                      {
                        key: 'when',
                        header: 'When',
                        render: (row) =>
                          `${formatShortDate(row.scheduledAt)} · ${formatTime(row.scheduledAt)}`,
                      },
                      {
                        key: 'status',
                        header: 'Status',
                        render: (row) => row.status,
                      },
                      {
                        key: 'receipt',
                        header: '',
                        align: 'right',
                        render: (row) => (
                          <Link href={`/devotee/receipt/booking/${row.id}`} target="_blank">
                            Receipt
                          </Link>
                        ),
                      },
                    ]}
                    data={recentBookings as Booking[]}
                  />
                ) : (
                  <p className="tms-t2" style={{ padding: '1rem' }}>
                    No bookings yet. <Link href="/devotee/book">Book seva</Link>
                  </p>
                )}
              </GlassCard>
            </BentoItem>
            <BentoItem span={6}>
              <GlassCard title="Recent Donations">
                {(data?.recentDonations?.length ?? 0) > 0 ? (
                  <ul className={styles.recentList}>
                    {data!.recentDonations!.map((d) => (
                      <li key={d.id} className={styles.recentItem}>
                        <span>
                          {formatMoney(d.amount, d.currency)} — {d.purpose}
                        </span>
                        <Link href={`/devotee/receipt/donation/${d.id}`} target="_blank">
                          Receipt
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="tms-t2">
                    {devotee?.ytdDonations
                      ? `YTD: ${formatMoney(devotee.ytdDonations.amount, devotee.ytdDonations.currency)}`
                      : 'No recent donations.'}{' '}
                    <Link href="/devotee/donate">Donate</Link>
                    {data?.donationsUnavailable && (
                      <span className="tms-t3"> (full history requires devotee donations API)</span>
                    )}
                  </p>
                )}
              </GlassCard>
            </BentoItem>
          </BentoGrid>

          <BentoGrid className="mb2">
            <BentoItem span={12}>
              <GlassCard title="My recurring sevas">
                {activeSevaSubs.length > 0 ? (
                  <ul className={styles.recentList}>
                    {activeSevaSubs.map((sub) => (
                      <li key={sub.id} className={styles.recentItem}>
                        <span>
                          {SERVICE_LABELS[sub.serviceId] ?? sub.serviceId.replace('svc-', '')}
                          {' · '}
                          {sub.frequency} · next {formatShortDate(sub.nextDate)}
                          {sub.sankalpa?.sponsorName ? ` · ${sub.sankalpa.sponsorName}` : ''}
                        </span>
                        <Chip>{sub.status}</Chip>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="tms-t2">
                    No active recurring sevas.{' '}
                    <Link href="/devotee/book">Book seva</Link> or ask temple admin to set one up.
                  </p>
                )}
              </GlassCard>
            </BentoItem>
          </BentoGrid>

          <BentoGrid>
            <BentoItem span={6}>
              <GlassCard title="Quick Actions">
                <div className={`flexRow flexWrap ${styles.quickActions}`}>
                  <Link href="/devotee/book"><Button variant="primary">🙏 Book Seva</Button></Link>
                  <Link href="/devotee/donate"><Button variant="primary">💝 Donate</Button></Link>
                  <Link href="/devotee/profile"><Button>👤 My Profile</Button></Link>
                  <Button>📺 Watch Live</Button>
                </div>
              </GlassCard>
            </BentoItem>
            <BentoItem span={6}>
              <GlassCard title={`Suggested for ${nakshatra} Star Day`} headerRight={<Chip>Personalised</Chip>}>
                <div className={`flexRowLg ${styles.suggestion}`}>
                  <span className={styles.suggestionEmoji} aria-hidden>
                    🪔
                  </span>
                  <div>
                    <strong>{nakshatra} Archana</strong>
                    <div className="tms-t2">$25 · Available Sat–Mon</div>
                  </div>
                  <Button variant="primary" size="sm" className={styles.suggestionAction}>
                    Book
                  </Button>
                </div>
                <div className="divider" />
                <div className={`flexRowLg ${styles.suggestion}`}>
                  <span className={styles.suggestionEmoji} aria-hidden>
                    🛁
                  </span>
                  <div>
                    <strong>Special Abhishekam</strong>
                    <div className="tms-t2">$101 · Sunday 10 AM</div>
                  </div>
                  <Button size="sm" className={styles.suggestionAction}>
                    View
                  </Button>
                </div>
              </GlassCard>
            </BentoItem>
          </BentoGrid>
        </>
      ) : (
        <div className={styles.phoneWrap}>
          <div className={styles.phoneShell}>
            <div className={styles.phoneNotch} />
            <div className={styles.phoneHead}>
              <div className={styles.phoneTempleIcon}>{site.icon}</div>
              <h3>{site.name}</h3>
              <p>{site.location} · PROD</p>
            </div>
            <div className={styles.phoneBody}>
              <div className={styles.phoneHeroCard}>
                <div className={styles.phoneHeroLabel}>Next Booking</div>
                <div className={styles.phoneHeroValue}>
                  {bookingService} · {bookingDate}
                </div>
                <Button size="sm" className={styles.phoneHeroBtn}>
                  View QR Pass
                </Button>
              </div>
              <div className={styles.phoneSectionLabel}>Services</div>
              <div className={styles.phoneGrid}>
                {[
                  { emoji: '🙏', label: 'Book Seva' },
                  { emoji: '💝', label: 'Donate' },
                  { emoji: '📺', label: 'Live' },
                  { emoji: '📄', label: 'Receipts' },
                  { emoji: '🎫', label: 'My Token' },
                  { emoji: '🛁', label: 'Special' },
                ].map((item) => (
                  <div key={item.label} className={styles.phoneMini}>
                    <span className={styles.phoneMiniEmoji}>{item.emoji}</span>
                    {item.label}
                  </div>
                ))}
              </div>
              <div className={styles.phoneLiveCard}>
                <div className={styles.phoneLiveLabel}>● LIVE NOW</div>
                <div className={styles.phoneLiveValue}>Evening Aarti · 418 watching</div>
              </div>
            </div>
            <div className={styles.phoneNav}>
              {[
                { emoji: '🏠', label: 'Home', active: true },
                { emoji: '🙏', label: 'Seva' },
                { emoji: '💝', label: 'Donate' },
                { emoji: '📄', label: 'Docs' },
                { emoji: '👤', label: 'Me' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={[styles.phoneNavItem, item.active ? styles.phoneNavActive : ''].filter(Boolean).join(' ')}
                >
                  <span className={styles.phoneNavEmoji}>{item.emoji}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

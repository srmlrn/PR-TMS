'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BentoGrid,
  BentoItem,
  Button,
  Chip,
  GlassCard,
  PageHeader,
  StatTile,
} from '@tms/ui';
import { BookingStatus } from '@tms/types';
import { formatMoney, formatShortDate, formatTime } from '@/lib/api/endpoints';
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
    <div className={styles.apiBanner}>
      {loading && 'Loading live data…'}
      {!loading && error && `Using demo data — ${error}`}
    </div>
  );
}

export default function DevoteeHomePage() {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');

  const { data, loading, error } = useApi((ep) =>
    Promise.all([ep.getDevotees({ limit: 1 }), ep.getBookings({ limit: 5 })]).then(
      ([devotees, bookings]) => ({ devotee: devotees.data[0] ?? null, bookings }),
    ),
  );

  const devotee = data?.devotee;
  const nextBooking = data?.bookings?.data.find(
    (b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING,
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
              <div className={styles.phoneTempleIcon}>🛕</div>
              <h3>Sri Venkateswara Temple</h3>
              <p>Fremont, CA · PROD</p>
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

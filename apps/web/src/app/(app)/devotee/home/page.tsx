'use client';

import Link from 'next/link';
import { Badge, Button, GlassCard } from '@tms/ui';
import type { Booking, Donation, SevaSubscription } from '@tms/types';
import { BookingStatus } from '@tms/types';
import { formatMoney, formatShortDate, formatTime } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth-context';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import { useTenantSite } from '@/lib/tenant-site';
import { useApi } from '@/lib/api/use-api';
import styles from './home.module.css';

const SERVICE_LABELS: Record<string, string> = {
  'svc-archana': 'Archana',
  'svc-abhishekam': 'Abhishekam',
  'svc-homam': 'Homam',
};

export default function DevoteeHomePage() {
  const { user } = useAuth();
  const site = useTenantSite();
  const taxYear = new Date().getFullYear();

  type HomeData = {
    bookings: { data: Booking[] };
    donations: { data: Donation[] };
    sevaSubscriptions: SevaSubscription[];
    taxReady: boolean;
  };

  const { data, loading, error } = useApi<HomeData>(
    async (ep) => {
      if (!user?.devoteeId) {
        return { bookings: { data: [] }, donations: { data: [] }, sevaSubscriptions: [], taxReady: false };
      }
      const [bookings, donations, sevaSubscriptions] = await Promise.all([
        ep.getBookings({ devoteeId: user.devoteeId, limit: 8 }),
        ep.getDonations({ devoteeId: user.devoteeId, limit: 8 }).catch(() => ({
          data: [] as Donation[],
          meta: { total: 0, page: 1, limit: 8, totalPages: 0 },
        })),
        ep.getSevaSubscriptions({ devoteeId: user.devoteeId, status: 'active' }).catch(() => ({
          data: [] as SevaSubscription[],
        })),
      ]);

      let taxReady = donations.data.length > 0;
      if (!taxReady) {
        try {
          await ep.getDevoteeAnnualTaxStatement(user.devoteeId, taxYear);
          taxReady = true;
        } catch {
          taxReady = false;
        }
      }

      return {
        bookings,
        donations,
        sevaSubscriptions: sevaSubscriptions.data,
        taxReady,
      };
    },
    [user?.devoteeId, taxYear],
  );

  const recentBookings = data?.bookings?.data ?? [];
  const recentDonations = data?.donations?.data ?? [];
  const activeSevaSubs = data?.sevaSubscriptions ?? [];

  const nextBooking = recentBookings.find(
    (b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING,
  );

  const nakshatra = 'Rohini';
  const ytdDonations =
    recentDonations.reduce((sum, d) => sum + d.amount, 0) > 0
      ? formatMoney(
          recentDonations.reduce((sum, d) => sum + d.amount, 0),
          recentDonations[0]?.currency,
        )
      : '$1,850';

  const bookingService = nextBooking
    ? SERVICE_LABELS[nextBooking.serviceId] ?? nextBooking.serviceId.replace('svc-', '')
    : 'Archana';
  const bookingWhen = nextBooking
    ? `${formatShortDate(nextBooking.scheduledAt)} · ${formatTime(nextBooking.scheduledAt)}`
    : 'Jun 7 · 4:00 AM';

  const receiptCount = recentBookings.length + recentDonations.length;

  return (
    <>
      <PageIntro
        subtitle={`${site.name} · ${site.deity} · ⭐ ${nakshatra} Nakshatra today`}
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.page}>
        <div className={styles.statsStrip}>
          <span className={styles.statItem}>
            📅 <strong>{bookingService}</strong> · {bookingWhen}
          </span>
          <span className={styles.statDivider}>·</span>
          <span className={styles.statItem}>
            💰 <strong>{ytdDonations}</strong> YTD
          </span>
          <span className={styles.statDivider}>·</span>
          <span className={styles.statItem}>
            🏅 <strong>Patron</strong> · Renews Dec 2026
          </span>
          <span className={styles.statDivider}>·</span>
          <span className={styles.statItem}>
            📄 <Link href="/devotee/documents" className={styles.statLink}>
              {receiptCount} receipts
            </Link>
          </span>
        </div>

        <div className={styles.workspace}>
          <section className={styles.mainCol}>
            <GlassCard
              title="Recent activity"
              headerRight={
                <Link href="/devotee/documents">
                  <Button size="sm" variant="outline">
                    All receipts
                  </Button>
                </Link>
              }
            >
              {recentBookings.length === 0 && recentDonations.length === 0 ? (
                <p className={styles.empty}>
                  No activity yet. <Link href="/devotee/book">Book seva</Link> or{' '}
                  <Link href="/devotee/donate">donate</Link>.
                </p>
              ) : (
                <div className={styles.activityList}>
                  {recentBookings.map((b) => (
                    <article key={b.id} className={styles.activityRow}>
                      <div className={styles.activityMain}>
                        <strong>
                          {SERVICE_LABELS[b.serviceId] ?? b.serviceId.replace('svc-', '')}
                        </strong>
                        <p className={styles.activitySub}>
                          {formatShortDate(b.scheduledAt)} · {formatTime(b.scheduledAt)} · {b.status}
                        </p>
                      </div>
                      <div className={styles.activityActions}>
                        <Link href={`/devotee/receipt/booking/${b.id}`} target="_blank">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </div>
                    </article>
                  ))}
                  {recentDonations.map((d) => (
                    <article key={d.id} className={styles.activityRow}>
                      <div className={styles.activityMain}>
                        <strong>{d.purpose}</strong>
                        <p className={styles.activitySub}>
                          {formatMoney(d.amount, d.currency)} · #{d.receiptNumber}
                        </p>
                      </div>
                      <div className={styles.activityActions}>
                        <Link href={`/devotee/receipt/donation/${d.id}`} target="_blank">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard title="My recurring sevas">
              {activeSevaSubs.length > 0 ? (
                <ul className={styles.subList}>
                  {activeSevaSubs.map((sub) => (
                    <li key={sub.id} className={styles.subItem}>
                      <span>
                        {SERVICE_LABELS[sub.serviceId] ?? sub.serviceId.replace('svc-', '')}
                        {' · '}
                        {sub.frequency} · next {formatShortDate(sub.nextDate)}
                      </span>
                      <Badge variant="ok">{sub.status}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>
                  No active recurring sevas.{' '}
                  <Link href="/devotee/book">Book seva</Link>
                </p>
              )}
            </GlassCard>
          </section>

          <aside className={styles.sideCol}>
            {data?.taxReady && (
              <GlassCard title="Tax documents">
                <div className={styles.taxPromo}>
                  <strong>✓ {taxYear} tax letter ready</strong>
                  <p>
                    Download your annual giving statement (IRS 501(c)(3), 80G, or CRA) plus individual
                    donation receipts.
                  </p>
                  <Link href="/devotee/documents">
                    <Button size="sm" variant="primary">
                      Receipts & tax letters
                    </Button>
                  </Link>
                </div>
              </GlassCard>
            )}

            <GlassCard title="Quick actions">
              <div className={styles.quickGrid}>
                <Link href="/devotee/book" className={styles.quickBtnPrimary}>
                  🙏 Book Seva
                </Link>
                <Link href="/devotee/donate" className={styles.quickBtnPrimary}>
                  💝 Donate
                </Link>
                <Link href="/devotee/documents" className={styles.quickBtn}>
                  📄 Receipts
                </Link>
                <Link href="/devotee/profile" className={styles.quickBtn}>
                  👤 Profile
                </Link>
              </div>
            </GlassCard>

            <GlassCard title={`Suggested for ${nakshatra}`} headerRight={<Badge variant="info">Star day</Badge>}>
              <div className={styles.suggestion}>
                <span className={styles.suggestionEmoji}>🪔</span>
                <div>
                  <strong>{nakshatra} Archana</strong>
                  <div className="tms-t3">$25 · Sat–Mon</div>
                </div>
                <Link href="/devotee/book" className={styles.suggestionAction}>
                  <Button size="sm" variant="primary">
                    Book
                  </Button>
                </Link>
              </div>
            </GlassCard>

            <GlassCard title="Live darshan">
              <p className={styles.empty}>
                <strong style={{ color: 'var(--gr)' }}>● Evening Aarti</strong>
                <br />
                418 watching · <Button size="sm">Watch</Button>
              </p>
            </GlassCard>
          </aside>
        </div>
      </div>
    </>
  );
}

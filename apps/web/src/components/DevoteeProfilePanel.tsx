'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button } from '@tms/ui';
import type { DevoteeProfile, SevaService } from '@tms/types';
import type { Endpoints } from '@/lib/api/endpoints';
import { formatMoney, formatShortDate, formatTime } from '@/lib/api/endpoints';
import styles from './DevoteeProfilePanel.module.css';

interface Props {
  ep: Endpoints;
  devoteeId: string;
  services: SevaService[];
  onSelectMember?: (id: string) => void;
  onCheckIn?: (bookingId: string) => void;
  checkInBusy?: boolean;
  refreshToken?: number;
}

function serviceLabel(services: SevaService[], serviceId: string): string {
  return services.find((s) => s.id === serviceId)?.name ?? serviceId;
}

function formatAddress(p: DevoteeProfile): string {
  const parts = [p.addressLine1, p.city, p.state, p.postalCode].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
}

export function DevoteeProfilePanel({
  ep,
  devoteeId,
  services,
  onSelectMember,
  onCheckIn,
  checkInBusy,
  refreshToken = 0,
}: Props) {
  const [profile, setProfile] = useState<DevoteeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'family' | 'bookings' | 'donations'>('overview');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    ep.getDevoteeProfile(devoteeId)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ep, devoteeId, refreshToken]);

  if (loading) {
    return <p className={styles.muted}>Loading devotee profile…</p>;
  }
  if (error || !profile) {
    return <p className={styles.error}>{error ?? 'Profile unavailable'}</p>;
  }

  const tabs = [
    { id: 'overview' as const, label: 'Details' },
    { id: 'family' as const, label: `Family (${profile.familyMembers.length})` },
    {
      id: 'bookings' as const,
      label: `Seva (${profile.upcomingBookings.length + profile.bookingHistory.length})`,
    },
    { id: 'donations' as const, label: `Donations (${profile.recentDonations.length})` },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.name}>
            {profile.firstName} {profile.lastName}
          </h3>
          <p className={styles.meta}>
            {profile.phone}
            {profile.email ? ` · ${profile.email}` : ''}
            {profile.membershipTier ? ` · ${profile.membershipTier}` : ''}
            {profile.ytdDonations
              ? ` · YTD ${formatMoney(profile.ytdDonations.amount, profile.ytdDonations.currency)}`
              : ''}
          </p>
        </div>
        <div className={styles.headActions}>
          <Badge variant={profile.status === 'active' ? 'ok' : 'pending'}>{profile.status}</Badge>
          <Link href="/admin/devotees">
            <Button size="sm" variant="outline">
              Open CRM
            </Button>
          </Link>
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className={styles.section}>
          <dl className={styles.dl}>
            <div>
              <dt>Address</dt>
              <dd>{formatAddress(profile)}</dd>
            </div>
            <div>
              <dt>Gotram / Nakshatra</dt>
              <dd>
                {[profile.gotram, profile.nakshatra, profile.rashi].filter(Boolean).join(' · ') || '—'}
              </dd>
            </div>
            <div>
              <dt>DOB / Gender</dt>
              <dd>
                {[profile.dateOfBirth, profile.gender].filter(Boolean).join(' · ') || '—'}
              </dd>
            </div>
            <div>
              <dt>Household ID</dt>
              <dd>{profile.familyId ?? '—'}</dd>
            </div>
          </dl>

          {profile.todayBookings.length > 0 && (
            <div className={styles.subSection}>
              <h4>Today&apos;s sevas</h4>
              <ul className={styles.list}>
                {profile.todayBookings.map((b) => (
                  <li key={b.id} className={styles.listRow}>
                    <span>
                      {formatTime(b.scheduledAt)} · {serviceLabel(services, b.serviceId)} · {b.status}
                      {b.checkedIn ? ' · ✓ checked in' : ''}
                    </span>
                    {!b.checkedIn && onCheckIn && (
                      <Button size="sm" variant="outline" onClick={() => onCheckIn(b.id)} disabled={checkInBusy}>
                        Check in
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.upcomingBookings.length > 0 && (
            <div className={styles.subSection}>
              <h4>Upcoming</h4>
              <ul className={styles.list}>
                {profile.upcomingBookings.map((b) => (
                  <li key={b.id}>
                    {formatShortDate(b.scheduledAt)} {formatTime(b.scheduledAt)} ·{' '}
                    {serviceLabel(services, b.serviceId)} · {formatMoney(b.amount, b.currency)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'family' && (
        <div className={styles.section}>
          {profile.familyMembers.length === 0 ? (
            <p className={styles.muted}>No linked family members. Add a household ID in CRM.</p>
          ) : (
            <ul className={styles.list}>
              {profile.familyMembers.map((m) => (
                <li key={m.id} className={styles.listRow}>
                  <span>
                    <strong>{m.name}</strong>
                    {m.relationship ? ` · ${m.relationship}` : ''}
                    {m.phone ? ` · ${m.phone}` : ''}
                    {m.gotram ? ` · ${m.gotram}` : ''}
                  </span>
                  {onSelectMember && (
                    <Button size="sm" variant="outline" onClick={() => onSelectMember(m.id)}>
                      View
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <div className={styles.section}>
          {profile.upcomingBookings.length > 0 && (
            <>
              <h4 className={styles.subHead}>Upcoming pooja / seva</h4>
              <ul className={styles.list}>
                {profile.upcomingBookings.map((b) => (
                  <li key={`up-${b.id}`}>
                    {formatShortDate(b.scheduledAt)} · {serviceLabel(services, b.serviceId)} ·{' '}
                    {b.status} · {formatMoney(b.amount, b.currency)} · {b.channel}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h4 className={styles.subHead}>History</h4>
          {profile.bookingHistory.length === 0 ? (
            <p className={styles.muted}>No past bookings on file.</p>
          ) : (
            <ul className={styles.list}>
              {profile.bookingHistory.map((b) => (
                <li key={b.id}>
                  {formatShortDate(b.scheduledAt)} · {serviceLabel(services, b.serviceId)} ·{' '}
                  {b.status} · {formatMoney(b.amount, b.currency)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'donations' && (
        <div className={styles.section}>
          {profile.recentDonations.length === 0 ? (
            <p className={styles.muted}>No donations on file yet.</p>
          ) : (
            <ul className={styles.list}>
              {profile.recentDonations.map((d) => (
                <li key={d.id}>
                  {formatShortDate(d.createdAt)} · {formatMoney(d.amount, d.currency)} · {d.purpose}
                  {d.receiptNumber ? ` · #${d.receiptNumber}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

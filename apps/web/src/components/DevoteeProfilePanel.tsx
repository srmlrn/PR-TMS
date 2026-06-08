'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button } from '@tms/ui';
import type {
  DevoteeAddressEntry,
  DevoteeEmail,
  DevoteePhone,
  DevoteeProfile,
  DevoteeProfileBooking,
  DevoteeProfileDonation,
  SevaService,
} from '@tms/types';
import { IN_LANGUAGES, IN_STATES } from '@tms/types';
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
  showCrmLink?: boolean;
}

type ProfileTab = 'overview' | 'family' | 'bookings' | 'donations' | 'history';

type HistoryRow =
  | {
      key: string;
      kind: 'booking';
      date: string;
      booking: DevoteeProfileBooking;
    }
  | {
      key: string;
      kind: 'donation';
      date: string;
      donation: DevoteeProfileDonation;
    };

function serviceLabel(services: SevaService[], serviceId: string): string {
  return services.find((s) => s.id === serviceId)?.name ?? serviceId;
}

function formatAddressLine(entry: DevoteeAddressEntry | Pick<DevoteeProfile, 'addressLine1' | 'city' | 'state' | 'postalCode'>): string {
  const line1 = 'line1' in entry ? entry.line1 : entry.addressLine1;
  const parts = [line1, entry.city, entry.state, entry.postalCode].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
}

function phoneTypeLabel(type: DevoteePhone['type']): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function emailTypeLabel(type: DevoteeEmail['type']): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function addressTypeLabel(type: DevoteeAddressEntry['type']): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function languageLabel(code?: string): string {
  if (!code) return '—';
  return IN_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

function indiaStateLabel(code?: string): string {
  if (!code) return '—';
  const match = IN_STATES.find((s) => s.code === code);
  return match ? `${match.name} (${match.code})` : code;
}

function ContactList({
  items,
}: {
  items: { key: string; label: string; value: string }[];
}) {
  if (items.length === 0) return <dd>—</dd>;
  return (
    <dd>
      <ul className={styles.contactList}>
        {items.map((item) => (
          <li key={item.key}>
            <span className={styles.contactType}>{item.label}</span> {item.value}
          </li>
        ))}
      </ul>
    </dd>
  );
}

function paymentBadge(status?: string): { label: string; variant: 'ok' | 'pending' | 'error' } {
  if (!status) return { label: '—', variant: 'pending' };
  if (status === 'paid' || status === 'completed') return { label: 'Paid', variant: 'ok' };
  if (status === 'pending' || status === 'processing') return { label: 'Pending', variant: 'pending' };
  return { label: status, variant: 'error' };
}

function channelLabel(channel: string): string {
  switch (channel) {
    case 'counter':
      return 'Counter';
    case 'kiosk':
      return 'Kiosk';
    case 'online':
      return 'Online';
    case 'app':
      return 'App';
    default:
      return channel;
  }
}

function donationTypeLabel(purpose: string): string {
  if (purpose.startsWith('Counter —') || purpose.startsWith('Article sale')) {
    return 'Counter sale';
  }
  return 'Donation';
}

function ReceiptLink({ type, id }: { type: 'booking' | 'donation'; id: string }) {
  return (
    <Link href={`/devotee/receipt/${type}/${id}`} target="_blank" className={styles.receiptLink}>
      Receipt
    </Link>
  );
}

function BookingRow({
  booking,
  services,
  showDate = true,
  onCheckIn,
  checkInBusy,
}: {
  booking: DevoteeProfileBooking;
  services: SevaService[];
  showDate?: boolean;
  onCheckIn?: (bookingId: string) => void;
  checkInBusy?: boolean;
}) {
  const pay = paymentBadge(booking.paymentStatus);
  return (
    <tr>
      {showDate && (
        <td>
          {formatShortDate(booking.scheduledAt)}
          <span className={styles.subMeta}> {formatTime(booking.scheduledAt)}</span>
        </td>
      )}
      <td>
        <span className={styles.typeBadge}>Seva</span>
      </td>
      <td>
        <strong>{serviceLabel(services, booking.serviceId)}</strong>
        <div className={styles.subMeta}>
          {booking.status} · {channelLabel(booking.channel)}
          {booking.checkedIn ? ' · ✓ checked in' : ''}
        </div>
      </td>
      <td>{formatMoney(booking.amount, booking.currency)}</td>
      <td>
        <Badge variant={pay.variant}>{pay.label}</Badge>
      </td>
      <td className={styles.actionsCell}>
        {booking.receiptNumber && (
          <span className={styles.receiptNum}>#{booking.receiptNumber}</span>
        )}
        <ReceiptLink type="booking" id={booking.id} />
        {!booking.checkedIn && onCheckIn && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCheckIn(booking.id)}
            disabled={checkInBusy}
          >
            Check in
          </Button>
        )}
      </td>
    </tr>
  );
}

function DonationRow({
  donation,
  showDate = true,
}: {
  donation: DevoteeProfileDonation;
  showDate?: boolean;
}) {
  const pay = paymentBadge(donation.paymentStatus);
  const typeLabel = donationTypeLabel(donation.purpose);
  return (
    <tr>
      {showDate && <td>{formatShortDate(donation.createdAt)}</td>}
      <td>
        <span className={`${styles.typeBadge} ${styles.typeDonation}`}>{typeLabel}</span>
      </td>
      <td>
        <strong>{donation.purpose}</strong>
      </td>
      <td>{formatMoney(donation.amount, donation.currency)}</td>
      <td>
        <Badge variant={pay.variant}>{pay.label}</Badge>
      </td>
      <td className={styles.actionsCell}>
        {donation.receiptNumber && (
          <span className={styles.receiptNum}>#{donation.receiptNumber}</span>
        )}
        <ReceiptLink type="donation" id={donation.id} />
      </td>
    </tr>
  );
}

export function DevoteeProfilePanel({
  ep,
  devoteeId,
  services,
  onSelectMember,
  onCheckIn,
  checkInBusy,
  refreshToken = 0,
  showCrmLink = true,
}: Props) {
  const [profile, setProfile] = useState<DevoteeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>('history');

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

  const historyRows = useMemo((): HistoryRow[] => {
    if (!profile) return [];
    const rows: HistoryRow[] = [];
    for (const b of [...profile.upcomingBookings, ...profile.bookingHistory]) {
      rows.push({
        key: `b-${b.id}`,
        kind: 'booking',
        date: b.scheduledAt,
        booking: b,
      });
    }
    for (const d of profile.recentDonations) {
      rows.push({
        key: `d-${d.id}`,
        kind: 'donation',
        date: d.createdAt,
        donation: d,
      });
    }
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [profile]);

  if (loading) {
    return <p className={styles.muted}>Loading devotee profile…</p>;
  }
  if (error || !profile) {
    return <p className={styles.error}>{error ?? 'Profile unavailable'}</p>;
  }

  const totalBookings = profile.upcomingBookings.length + profile.bookingHistory.length;
  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'history', label: `History & receipts (${historyRows.length})` },
    { id: 'overview', label: 'Details' },
    { id: 'family', label: `Family (${profile.familyMembers.length})` },
    { id: 'bookings', label: `Seva (${totalBookings})` },
    { id: 'donations', label: `Donations (${profile.recentDonations.length})` },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.name}>
            {profile.title ? `${profile.title} ` : ''}
            {profile.firstName} {profile.lastName}
          </h3>
          <p className={styles.meta}>
            {profile.phone}
            {profile.email ? ` · ${profile.email}` : ''}
            {profile.membershipTier ? ` · ${profile.membershipTier}` : ''}
            {profile.communicationOptIn === false ? ' · Not mailable' : ''}
          </p>
        </div>
        <div className={styles.headActions}>
          <Badge variant={profile.status === 'active' ? 'ok' : 'pending'}>{profile.status}</Badge>
          {showCrmLink && (
            <Link href="/admin/devotees">
              <Button size="sm" variant="outline">
                Open CRM
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className={styles.summaryStrip}>
        <span>
          <strong>{totalBookings}</strong> bookings
        </span>
        <span className={styles.summaryDot}>·</span>
        <span>
          <strong>{profile.recentDonations.length}</strong> payments
        </span>
        {profile.ytdDonations && (
          <>
            <span className={styles.summaryDot}>·</span>
            <span>
              YTD <strong>{formatMoney(profile.ytdDonations.amount, profile.ytdDonations.currency)}</strong>
            </span>
          </>
        )}
        {profile.todayBookings.length > 0 && (
          <>
            <span className={styles.summaryDot}>·</span>
            <span>
              <strong>{profile.todayBookings.length}</strong> today
            </span>
          </>
        )}
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

      {tab === 'history' && (
        <div className={styles.section}>
          {historyRows.length === 0 ? (
            <p className={styles.muted}>No bookings, donations, or receipts on file yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) =>
                    row.kind === 'booking' ? (
                      <BookingRow
                        key={row.key}
                        booking={row.booking}
                        services={services}
                        onCheckIn={onCheckIn}
                        checkInBusy={checkInBusy}
                      />
                    ) : (
                      <DonationRow key={row.key} donation={row.donation} />
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'overview' && (
        <div className={styles.section}>
          <dl className={styles.dl}>
            <div>
              <dt>Phones</dt>
              <ContactList
                items={(profile.phones ?? [{ type: 'cell', number: profile.phone }]).map((p, i) => ({
                  key: `phone-${i}`,
                  label: phoneTypeLabel(p.type),
                  value: p.number,
                }))}
              />
            </div>
            <div>
              <dt>Emails</dt>
              <ContactList
                items={
                  profile.emails?.length
                    ? profile.emails.map((e, i) => ({
                        key: `email-${i}`,
                        label: emailTypeLabel(e.type),
                        value: e.address,
                      }))
                    : profile.email
                      ? [{ key: 'email-0', label: 'Home', value: profile.email }]
                      : []
                }
              />
            </div>
            <div>
              <dt>Addresses</dt>
              {profile.addresses?.length ? (
                <dd>
                  <ul className={styles.contactList}>
                    {profile.addresses.map((a, i) => (
                      <li key={`addr-${i}`}>
                        <span className={styles.contactType}>{addressTypeLabel(a.type)}</span>{' '}
                        {formatAddressLine(a)}
                        {a.line2 ? ` · ${a.line2}` : ''}
                      </li>
                    ))}
                  </ul>
                </dd>
              ) : (
                <dd>{formatAddressLine(profile)}</dd>
              )}
            </div>
            <div>
              <dt>India state / Language</dt>
              <dd>
                {[indiaStateLabel(profile.indiaState), languageLabel(profile.preferredLanguage)]
                  .filter((v) => v !== '—')
                  .join(' · ') || '—'}
              </dd>
            </div>
            <div>
              <dt>Mailable</dt>
              <dd>{profile.communicationOptIn === false ? 'No' : 'Yes'}</dd>
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
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <tbody>
                    {profile.todayBookings.map((b) => {
                      const full = profile.upcomingBookings.find((u) => u.id === b.id) ??
                        profile.bookingHistory.find((h) => h.id === b.id);
                      if (full) {
                        return (
                          <BookingRow
                            key={b.id}
                            booking={{ ...full, checkedIn: b.checkedIn }}
                            services={services}
                            showDate={false}
                            onCheckIn={onCheckIn}
                            checkInBusy={checkInBusy}
                          />
                        );
                      }
                      return (
                        <tr key={b.id}>
                          <td colSpan={2}>
                            {formatTime(b.scheduledAt)} · {serviceLabel(services, b.serviceId)} · {b.status}
                          </td>
                          <td colSpan={4} className={styles.actionsCell}>
                            {!b.checkedIn && onCheckIn && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onCheckIn(b.id)}
                                disabled={checkInBusy}
                              >
                                Check in
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {profile.upcomingBookings.length > 0 && (
            <div className={styles.subSection}>
              <h4>Upcoming seva</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <tbody>
                    {profile.upcomingBookings.map((b) => (
                      <BookingRow key={b.id} booking={b} services={services} showDate />
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <tbody>
                    {profile.upcomingBookings.map((b) => (
                      <BookingRow
                        key={`up-${b.id}`}
                        booking={b}
                        services={services}
                        onCheckIn={onCheckIn}
                        checkInBusy={checkInBusy}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <h4 className={styles.subHead}>Past bookings</h4>
          {profile.bookingHistory.length === 0 ? (
            <p className={styles.muted}>No past bookings on file.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <tbody>
                  {profile.bookingHistory.map((b) => (
                    <BookingRow key={b.id} booking={b} services={services} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'donations' && (
        <div className={styles.section}>
          {profile.recentDonations.length === 0 ? (
            <p className={styles.muted}>No donations or counter payments on file yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.recentDonations.map((d) => (
                    <DonationRow key={d.id} donation={d} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

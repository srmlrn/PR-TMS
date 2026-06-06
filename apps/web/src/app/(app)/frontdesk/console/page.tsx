'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, GlassCard, PageHeader, StatTile } from '@tms/ui';
import {
  Currency,
  type DevoteeLookupResult,
  type PaymentProvider,
  type QueueToken,
  type QueueType,
} from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints, formatMoney } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import { CounterBookingForm } from '@/components/CounterBookingForm';
import { PaymentProviderPicker } from '@/components/PaymentProviderPicker';
import { checkoutAndPay, defaultPaymentProvider } from '@/lib/payment-flow';
import styles from './console.module.css';

const EMPTY_WALK_IN = {
  firstName: '',
  lastName: '',
  gotram: '',
  nakshatra: '',
};

function isToday(value: string | Date): boolean {
  const d = typeof value === 'string' ? new Date(value) : value;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function FrontDeskConsolePage() {
  const router = useRouter();
  const { api } = useTenant();
  const today = new Date().toISOString().slice(0, 10);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [lookup, setLookup] = useState<DevoteeLookupResult | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState(EMPTY_WALK_IN);
  const [registering, setRegistering] = useState(false);
  const [lastToken, setLastToken] = useState<QueueToken | null>(null);
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [priorityToken, setPriorityToken] = useState(false);
  const [queueType, setQueueType] = useState<QueueType>('darshan');
  const [busy, setBusy] = useState(false);
  const [donateAmount, setDonateAmount] = useState(51);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(() =>
    defaultPaymentProvider(Currency.USD, 'counter'),
  );
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const { data: stats, loading, error, refetch } = useApi((ep) => ep.getQueueStats());
  const { data: services } = useApi((ep) => ep.getServices());
  const {
    data: posData,
    loading: posLoading,
    error: posError,
    refetch: refetchPos,
  } = useApi(
    (ep) =>
      Promise.all([
        ep.getBookings({ date: today, limit: 100 }),
        ep.getDonations({ limit: 100 }),
      ]).then(([bookings, donations]) => ({ bookings, donations })),
    [today],
  );

  const counterBookings = (posData?.bookings?.data ?? []).filter((b) => b.channel === 'counter');
  const counterDonations = (posData?.donations?.data ?? []).filter(
    (d) => isToday(d.createdAt) && d.purpose.toLowerCase().includes('counter'),
  );
  const posBookingTotal = counterBookings.reduce((sum, b) => sum + b.amount, 0);
  const posDonationTotal = counterDonations.reduce((sum, d) => sum + d.amount, 0);
  const posTotal = posBookingTotal + posDonationTotal;
  const posCurrency = counterBookings[0]?.currency ?? counterDonations[0]?.currency ?? Currency.USD;

  async function refreshLookup() {
    const ep = createEndpoints(api);
    return ep.frontDeskLookup({
      phone: phone.trim() || undefined,
      name: name.trim() || undefined,
    });
  }

  async function handleLookup() {
    if (!phone.trim() && !name.trim()) {
      setLookupMessage('Enter phone or name to look up.');
      return;
    }
    setBusy(true);
    setLookup(null);
    setLookupMessage(null);
    setTokenResult(null);
    setLastToken(null);
    setActionMsg(null);
    setWalkIn(EMPTY_WALK_IN);
    try {
      const result = await refreshLookup();
      setLookup(result);
      if (!result.found) {
        setLookupMessage('No devotee found — register walk-in below.');
      }
    } catch (err) {
      setLookupMessage(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn(bookingId: string) {
    setBusy(true);
    setActionMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.checkInBooking(bookingId);
      const result = await refreshLookup();
      setLookup(result);
      setActionMsg('Checked in for today\'s seva.');
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterWalkIn() {
    if (!walkIn.firstName.trim() || !walkIn.lastName.trim() || !phone.trim()) {
      setLookupMessage('First name, last name, and phone are required.');
      return;
    }
    setRegistering(true);
    setLookupMessage(null);
    try {
      const ep = createEndpoints(api);
      const created = await ep.createDevotee({
        firstName: walkIn.firstName.trim(),
        lastName: walkIn.lastName.trim(),
        phone: phone.trim(),
        country: 'US',
        gotram: walkIn.gotram.trim() || undefined,
        nakshatra: walkIn.nakshatra.trim() || undefined,
      });
      const fullName = `${created.firstName} ${created.lastName}`;
      setLookup({
        found: true,
        devotee: {
          id: created.id,
          name: fullName,
          phone: created.phone,
          gotram: created.gotram,
          nakshatra: created.nakshatra,
        },
      });
      setLookupMessage(`Walk-in registered — ${fullName}`);
      setWalkIn(EMPTY_WALK_IN);
    } catch (err) {
      setLookupMessage(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  }

  async function handleIssueToken() {
    setBusy(true);
    setTokenResult(null);
    try {
      const ep = createEndpoints(api);
      const token = await ep.issueToken({
        devoteeId: lookup?.devotee?.id,
        devoteeName: lookup?.devotee?.name ?? 'Walk-in guest',
        queueType: priorityToken ? 'priority' : queueType,
        priority: priorityToken,
      });
      setLastToken(token);
      setTokenResult(
        `Token ${token.tokenNumber} · Position ${token.position} · ~${token.estimatedWaitMinutes} min wait`,
      );
      refetch();
      const guestName = encodeURIComponent(lookup?.devotee?.name ?? 'Walk-in guest');
      router.push(
        `/frontdesk/token-print?token=${encodeURIComponent(token.tokenNumber)}&position=${token.position}&wait=${token.estimatedWaitMinutes}&name=${guestName}`,
      );
    } catch (err) {
      setTokenResult(err instanceof Error ? err.message : 'Token issue failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleNotifySms() {
    if (!lastToken || !lookup?.devotee?.phone) {
      setTokenResult('Issue a token and look up devotee with phone first.');
      return;
    }
    setBusy(true);
    try {
      const ep = createEndpoints(api);
      const res = await ep.notifyQueueToken(lastToken.id, lookup.devotee.phone);
      setTokenResult(res.message);
    } catch (err) {
      setTokenResult(err instanceof Error ? err.message : 'SMS failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickDonate() {
    const devoteeId = lookup?.devotee?.id;
    if (!devoteeId) {
      setActionMsg('Look up or register a devotee first.');
      return;
    }
    setBusy(true);
    setActionMsg(null);
    try {
      const ep = createEndpoints(api);
      const paymentSessionId = await checkoutAndPay(ep, {
        amount: donateAmount,
        currency: Currency.USD,
        purpose: 'Counter donation',
        devoteeId,
        provider: paymentProvider,
      });
      const donation = await ep.createDonation({
        devoteeId,
        amount: donateAmount,
        currency: Currency.USD,
        purpose: 'Counter — General Hundi',
        paymentSessionId,
      });
      const receiptNumber = donation.receiptNumber ?? donation.id.slice(0, 8);
      setActionMsg(`Donation recorded (${paymentProvider}) · ${receiptNumber}`);
      refetchPos();
      const guestName = encodeURIComponent(lookup?.devotee?.name ?? 'Counter guest');
      router.push(
        `/frontdesk/receipt-print?amount=${donateAmount}&currency=${Currency.USD}` +
          `&receipt=${encodeURIComponent(receiptNumber)}` +
          `&name=${guestName}&purpose=${encodeURIComponent('Counter — General Hundi')}`,
      );
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Donation failed');
    } finally {
      setBusy(false);
    }
  }

  const devotee = lookup?.devotee;
  const showWalkInForm = lookup && !lookup.found;
  const ep = createEndpoints(api);
  const serviceList = services ?? [];

  return (
    <div className={styles.console}>
      <PageHeader
        title="Reception Console"
        subtitle="Lookup · tokens · check-in · book · donate"
        actions={
          <div className={styles.actionBar}>
            <Link href="/frontdesk/queue">
              <Button variant="outline" size="sm">Queue</Button>
            </Link>
            <Link href="/frontdesk/display">
              <Button variant="outline" size="sm">Display</Button>
            </Link>
          </div>
        }
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.metrics}>
        <StatTile compact accent="amber" label="In queue" value={String(stats?.inQueue ?? 0)} icon="🎫" />
        <StatTile compact accent="blue" label="Avg wait" value={`${stats?.averageWaitMinutes ?? 0}m`} icon="⏱️" />
        <StatTile compact accent="green" label="Served" value={String(stats?.servedToday ?? 0)} icon="✅" />
        <StatTile
          compact
          accent="amber"
          label="Bookings"
          value={formatMoney(posBookingTotal, posCurrency)}
          icon="🙏"
          change={`${counterBookings.length} today`}
        />
        <StatTile
          compact
          accent="green"
          label="Donations"
          value={formatMoney(posDonationTotal, posCurrency)}
          icon="💝"
          change={`${counterDonations.length} today`}
        />
        <StatTile
          compact
          accent="amber"
          label="POS total"
          value={formatMoney(posTotal, posCurrency)}
          icon="🧾"
        />
      </div>
      <ApiBanner loading={posLoading} error={posError} />

      <div className={styles.grid}>
        <GlassCard compact title="Devotee lookup" className={styles.span2}>
          <div className={styles.lookupRow}>
            <div className="formGroup">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 408-555-0101"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rajan Kumar"
              />
            </div>
            <Button size="sm" onClick={handleLookup} disabled={busy || (!phone.trim() && !name.trim())}>
              Look up
            </Button>
          </div>
          {lookupMessage && (
            <p className={[styles.statusMsg, devotee ? styles.statusMsgOk : ''].filter(Boolean).join(' ')}>
              {lookupMessage}
            </p>
          )}
          {devotee && (
            <div className={styles.devoteeChip}>
              <strong>{devotee.name}</strong>
              <div className={styles.devoteeMeta}>
                {devotee.phone}
                {devotee.gotram ? ` · ${devotee.gotram}` : ''}
                {devotee.nakshatra ? ` · ${devotee.nakshatra}` : ''}
                {devotee.membershipTier ? ` · ${devotee.membershipTier}` : ''}
                {devotee.ytdDonations
                  ? ` · YTD ${formatMoney(devotee.ytdDonations.amount, devotee.ytdDonations.currency)}`
                  : ''}
                {devotee.upcomingBooking ? ` · Next: ${devotee.upcomingBooking}` : ''}
              </div>
              {devotee.todayBookings && devotee.todayBookings.length > 0 && (
                <div className={styles.todayList}>
                  {devotee.todayBookings.map((b) => (
                    <div key={b.id} className={styles.todayRow}>
                      <span>
                        {new Date(b.scheduledAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {' · '}
                        {b.status}
                        {b.checkedIn ? ' · ✓' : ''}
                      </span>
                      {!b.checkedIn && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckIn(b.id)}
                          disabled={busy}
                        >
                          Check in
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {showWalkInForm && (
            <div className={styles.walkInForm}>
              <p className={styles.hint}>Walk-in registration</p>
              <div className={styles.walkInGrid}>
                <div className="formGroup">
                  <label htmlFor="wiFirst">First name</label>
                  <input
                    id="wiFirst"
                    value={walkIn.firstName}
                    onChange={(e) => setWalkIn({ ...walkIn, firstName: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="wiLast">Last name</label>
                  <input
                    id="wiLast"
                    value={walkIn.lastName}
                    onChange={(e) => setWalkIn({ ...walkIn, lastName: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="wiGotram">Gotram</label>
                  <input
                    id="wiGotram"
                    value={walkIn.gotram}
                    onChange={(e) => setWalkIn({ ...walkIn, gotram: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="wiNakshatra">Nakshatra</label>
                  <input
                    id="wiNakshatra"
                    value={walkIn.nakshatra}
                    onChange={(e) => setWalkIn({ ...walkIn, nakshatra: e.target.value })}
                  />
                </div>
              </div>
              <Button size="sm" onClick={handleRegisterWalkIn} disabled={registering || busy}>
                {registering ? 'Registering…' : 'Register'}
              </Button>
            </div>
          )}
        </GlassCard>

        <GlassCard compact title="Queue token">
          <div className={styles.tokenRow}>
            <div className="formGroup">
              <label htmlFor="queueType">Queue</label>
              <select
                id="queueType"
                value={queueType}
                onChange={(e) => setQueueType(e.target.value as QueueType)}
                disabled={priorityToken}
              >
                <option value="darshan">Darshan</option>
                <option value="seva">Seva</option>
              </select>
            </div>
            <Button size="sm" onClick={handleIssueToken} disabled={busy}>
              Issue
            </Button>
          </div>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={priorityToken}
              onChange={(e) => setPriorityToken(e.target.checked)}
            />
            VIP · front of queue
          </label>
          {tokenResult && <p className={styles.statusMsg}>{tokenResult}</p>}
          {lastToken && (
            <div className={styles.tokenActions}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const guestName = encodeURIComponent(lookup?.devotee?.name ?? 'Walk-in guest');
                  router.push(
                    `/frontdesk/token-print?token=${encodeURIComponent(lastToken.tokenNumber)}&position=${lastToken.position}&wait=${lastToken.estimatedWaitMinutes}&name=${guestName}`,
                  );
                }}
              >
                Reprint
              </Button>
              <Button size="sm" variant="outline" onClick={handleNotifySms} disabled={busy || !devotee?.phone}>
                SMS
              </Button>
            </div>
          )}
        </GlassCard>

        <GlassCard compact title="Quick donate">
          <PaymentProviderPicker
            value={paymentProvider}
            onChange={setPaymentProvider}
            currency={Currency.USD}
            channel="counter"
          />
          <div className="formGroup">
            <label htmlFor="donateAmt">Amount (USD)</label>
            <input
              id="donateAmt"
              type="number"
              min={1}
              value={donateAmount}
              onChange={(e) => setDonateAmount(Number(e.target.value))}
            />
          </div>
          <Button size="sm" onClick={handleQuickDonate} disabled={busy || !devotee}>
            Record {formatMoney(donateAmount)}
          </Button>
        </GlassCard>

        <GlassCard compact title="Counter booking" className={styles.span2}>
          {devotee && serviceList.length > 0 ? (
            <CounterBookingForm
              ep={ep}
              devotee={devotee}
              services={serviceList}
              onSuccess={(msg) => {
                setActionMsg(msg);
                refetchPos();
              }}
              onError={(msg) => setActionMsg(msg)}
            />
          ) : (
            <p className={styles.hint}>Look up a devotee to book seva with date, slot, and sankalpa.</p>
          )}
        </GlassCard>

        <GlassCard compact title="Kiosk">
          <p className={styles.hint}>Self-service prasadam & donations.</p>
          <Link href="/kiosk">
            <Button size="sm" variant="outline">Open kiosk</Button>
          </Link>
        </GlassCard>
      </div>
      {actionMsg && <p className={[styles.statusMsg, styles.statusMsgOk].join(' ')}>{actionMsg}</p>}
    </div>
  );
}

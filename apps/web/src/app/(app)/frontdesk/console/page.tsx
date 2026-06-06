'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, GlassCard, PageHeader, StatTile } from '@tms/ui';
import { Currency, type DevoteeLookupResult, type PaymentProvider, type QueueToken } from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints, formatMoney } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
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
  const [lookup, setLookup] = useState<DevoteeLookupResult | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState(EMPTY_WALK_IN);
  const [registering, setRegistering] = useState(false);
  const [lastToken, setLastToken] = useState<QueueToken | null>(null);
  const [tokenResult, setTokenResult] = useState<string | null>(null);
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

  async function handleLookup() {
    setBusy(true);
    setLookup(null);
    setLookupMessage(null);
    setTokenResult(null);
    setLastToken(null);
    setActionMsg(null);
    setWalkIn(EMPTY_WALK_IN);
    try {
      const ep = createEndpoints(api);
      const result = await ep.frontDeskLookup(phone);
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
      const name = `${created.firstName} ${created.lastName}`;
      setLookup({
        found: true,
        devotee: {
          id: created.id,
          name,
          phone: created.phone,
          gotram: created.gotram,
          nakshatra: created.nakshatra,
        },
      });
      setLookupMessage(`Walk-in registered — ${name}`);
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

  async function handleQuickBook() {
    const devoteeId = lookup?.devotee?.id;
    const service = services?.[0];
    if (!devoteeId || !service) {
      setActionMsg('Look up devotee and ensure services are loaded.');
      return;
    }
    setBusy(true);
    setActionMsg(null);
    try {
      const ep = createEndpoints(api);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const paymentSessionId = await checkoutAndPay(ep, {
        amount: service.price,
        currency: service.currency,
        purpose: `Counter: ${service.name}`,
        devoteeId,
        provider: paymentProvider,
      });
      const booking = await ep.createBooking({
        devoteeId,
        serviceId: service.id,
        scheduledAt: tomorrow.toISOString(),
        channel: 'counter',
        paymentSessionId,
        sankalpa: {
          sponsorName: lookup?.devotee?.name ?? 'Counter guest',
          gotram: lookup?.devotee?.gotram,
          nakshatra: lookup?.devotee?.nakshatra,
        },
      });
      setActionMsg(
        `Booked ${service.name} (${paymentProvider}) · ${booking.receiptNumber ?? booking.id.slice(0, 8)}`,
      );
      refetchPos();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  const devotee = lookup?.devotee;
  const showWalkInForm = lookup && !lookup.found;

  return (
    <>
      <PageHeader title="Reception Console" subtitle="Lookup, tokens, quick book & donate at counter" />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.stats}>
        <StatTile label="In Queue" value={String(stats?.inQueue ?? 12)} icon="🎫" />
        <StatTile label="Avg Wait" value={`${stats?.averageWaitMinutes ?? 18} min`} icon="⏱️" />
        <StatTile label="Served Today" value={String(stats?.servedToday ?? 84)} icon="✅" />
      </div>

      <GlassCard title="Today's Counter Sales (POS)" className={styles.posPanel}>
        <ApiBanner loading={posLoading} error={posError} />
        <div className={styles.posGrid}>
          <div>
            <p className={styles.posLabel}>Seva bookings</p>
            <p className={styles.posValue}>
              {counterBookings.length} · {formatMoney(posBookingTotal, posCurrency)}
            </p>
          </div>
          <div>
            <p className={styles.posLabel}>Donations</p>
            <p className={styles.posValue}>
              {counterDonations.length} · {formatMoney(posDonationTotal, posCurrency)}
            </p>
          </div>
          <div>
            <p className={styles.posLabel}>Total</p>
            <p className={styles.posTotal}>{formatMoney(posTotal, posCurrency)}</p>
          </div>
        </div>
      </GlassCard>

      <div className={styles.grid}>
        <GlassCard title="Devotee Lookup">
          <div className="formGroup">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 408-555-0101"
            />
          </div>
          <Button onClick={handleLookup} disabled={busy || !phone}>
            Look up
          </Button>
          {lookupMessage && (
            <p className="tms-t2 mt1" style={devotee ? { color: 'var(--gr)' } : undefined}>
              {lookupMessage}
            </p>
          )}
          {devotee && (
            <div className="calloutAmber mt1">
              <strong>{devotee.name}</strong>
              <p className="tms-t3">
                {devotee.phone}
                {devotee.gotram ? ` · Gotram: ${devotee.gotram}` : ''}
                {devotee.nakshatra ? ` · Nakshatra: ${devotee.nakshatra}` : ''}
              </p>
              {devotee.membershipTier && (
                <p className="tms-t3">Membership: {devotee.membershipTier}</p>
              )}
              {devotee.upcomingBooking && (
                <p className="tms-t3">Next booking: {devotee.upcomingBooking}</p>
              )}
            </div>
          )}
          {showWalkInForm && (
            <div className={styles.walkInForm}>
              <p className="tms-t3 mb1">Quick walk-in registration</p>
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
              <Button onClick={handleRegisterWalkIn} disabled={registering || busy}>
                {registering ? 'Registering…' : 'Register walk-in'}
              </Button>
            </div>
          )}
        </GlassCard>

        <GlassCard title="Issue Darshan Token">
          <p className="tms-t3">
            Issues token linked to devotee ID when lookup succeeds.
          </p>
          <Button onClick={handleIssueToken} disabled={busy} className="mt1">
            Issue Token
          </Button>
          {tokenResult && <p className="tms-t2 mt1">{tokenResult}</p>}
          {lastToken && (
            <Button
              variant="outline"
              className="mt1"
              onClick={() => {
                const guestName = encodeURIComponent(lookup?.devotee?.name ?? 'Walk-in guest');
                router.push(
                  `/frontdesk/token-print?token=${encodeURIComponent(lastToken.tokenNumber)}&position=${lastToken.position}&wait=${lastToken.estimatedWaitMinutes}&name=${guestName}`,
                );
              }}
            >
              Reprint token
            </Button>
          )}
        </GlassCard>

        <GlassCard title="Quick Donate (counter)">
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
          <Button onClick={handleQuickDonate} disabled={busy || !devotee}>
            Record {formatMoney(donateAmount)} donation
          </Button>
        </GlassCard>

        <GlassCard title="Quick Book (counter)">
          <PaymentProviderPicker
            value={paymentProvider}
            onChange={setPaymentProvider}
            currency={services?.[0]?.currency ?? Currency.USD}
            channel="counter"
          />
          <p className="tms-t3">
            Books next available {services?.[0]?.name ?? 'seva'} for looked-up devotee.
          </p>
          <Button onClick={handleQuickBook} disabled={busy || !devotee} className="mt1">
            Quick book seva
          </Button>
        </GlassCard>
      </div>
      {actionMsg && <p className="tms-t2 mt1">{actionMsg}</p>}
    </>
  );
}

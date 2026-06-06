'use client';

import { useState } from 'react';
import { Button, GlassCard, PageHeader, StatTile } from '@tms/ui';
import { Currency, type DevoteeLookupResult } from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints, formatMoney } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import { checkoutAndPay } from '@/lib/payment-flow';
import styles from './console.module.css';

export default function FrontDeskConsolePage() {
  const { api } = useTenant();
  const [phone, setPhone] = useState('');
  const [lookup, setLookup] = useState<DevoteeLookupResult | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [donateAmount, setDonateAmount] = useState(51);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const { data: stats, loading, error, refetch } = useApi((ep) => ep.getQueueStats());
  const { data: services } = useApi((ep) => ep.getServices());

  async function handleLookup() {
    setBusy(true);
    setLookup(null);
    setLookupMessage(null);
    setTokenResult(null);
    setActionMsg(null);
    try {
      const ep = createEndpoints(api);
      const result = await ep.frontDeskLookup(phone);
      setLookup(result);
      if (!result.found) {
        setLookupMessage('No devotee found — register walk-in in Devotee CRM.');
      }
    } catch (err) {
      setLookupMessage(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setBusy(false);
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
      setTokenResult(
        `Token ${token.tokenNumber} · Position ${token.position} · ~${token.estimatedWaitMinutes} min wait`,
      );
      refetch();
    } catch (err) {
      setTokenResult(err instanceof Error ? err.message : 'Token issue failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickDonate() {
    const devoteeId = lookup?.devotee?.id;
    if (!devoteeId) {
      setActionMsg('Look up a devotee first.');
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
        provider: 'cash',
      });
      const donation = await ep.createDonation({
        devoteeId,
        amount: donateAmount,
        currency: Currency.USD,
        purpose: 'Counter — General Hundi',
        paymentSessionId,
      }) as { receiptNumber?: string };
      setActionMsg(`Donation recorded · ${donation.receiptNumber ?? 'receipt issued'}`);
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
        provider: 'cash',
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
      setActionMsg(`Booked ${service.name} · ${booking.receiptNumber ?? booking.id.slice(0, 8)}`);
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  const devotee = lookup?.devotee;

  return (
    <>
      <PageHeader title="Reception Console" subtitle="Lookup, tokens, quick book & donate at counter" />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.stats}>
        <StatTile label="In Queue" value={String(stats?.inQueue ?? 12)} icon="🎫" />
        <StatTile label="Avg Wait" value={`${stats?.averageWaitMinutes ?? 18} min`} icon="⏱️" />
        <StatTile label="Served Today" value={String(stats?.servedToday ?? 84)} icon="✅" />
      </div>

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
          {lookupMessage && <p className="tms-t2 mt1">{lookupMessage}</p>}
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
        </GlassCard>

        <GlassCard title="Issue Darshan Token">
          <p className="tms-t3">
            Issues token linked to devotee ID when lookup succeeds.
          </p>
          <Button onClick={handleIssueToken} disabled={busy} className="mt1">
            Issue Token
          </Button>
          {tokenResult && <p className="tms-t2 mt1">{tokenResult}</p>}
        </GlassCard>

        <GlassCard title="Quick Donate (counter)">
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

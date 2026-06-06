'use client';

import { useState } from 'react';
import { Button, GlassCard, PageHeader, StatTile } from '@tms/ui';
import type { DevoteeLookupResult } from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './console.module.css';

export default function FrontDeskConsolePage() {
  const { api } = useTenant();
  const [phone, setPhone] = useState('');
  const [lookup, setLookup] = useState<DevoteeLookupResult | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: stats, loading, error, refetch } = useApi((ep) => ep.getQueueStats());

  async function handleLookup() {
    setBusy(true);
    setLookup(null);
    setLookupMessage(null);
    setTokenResult(null);
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

  const devotee = lookup?.devotee;

  return (
    <>
      <PageHeader title="Reception Console" subtitle="Devotee lookup, queue tokens, and live stats" />
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
            Issues token linked to devotee ID when lookup succeeds (industry standard).
          </p>
          <Button onClick={handleIssueToken} disabled={busy} className="mt1">
            Issue Token
          </Button>
          {tokenResult && <p className="tms-t2 mt1">{tokenResult}</p>}
        </GlassCard>
      </div>
    </>
  );
}

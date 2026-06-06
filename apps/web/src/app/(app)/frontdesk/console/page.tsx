'use client';

import { useState } from 'react';
import { Button, GlassCard, PageHeader, StatTile } from '@tms/ui';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './console.module.css';

export default function FrontDeskConsolePage() {
  const { api } = useTenant();
  const [phone, setPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<string | null>(null);
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: stats, loading, error, refetch } = useApi((ep) => ep.getQueueStats());

  async function handleLookup() {
    setBusy(true);
    setLookupResult(null);
    try {
      const ep = createEndpoints(api);
      const result = await ep.frontDeskLookup(phone);
      if (result.found && result.devotee) {
        setLookupResult(
          `${result.devotee.name} · ${result.devotee.phone}${
            result.devotee.upcomingBooking ? ` · Next: ${result.devotee.upcomingBooking}` : ''
          }`,
        );
      } else {
        setLookupResult('No devotee found — create a walk-in profile in Devotee CRM.');
      }
    } catch (err) {
      setLookupResult(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleIssueToken() {
    setBusy(true);
    setTokenResult(null);
    try {
      const ep = createEndpoints(api);
      const token = await ep.issueToken({ devoteeName: lookupResult?.split(' · ')[0] ?? 'Walk-in' });
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
          {lookupResult && <p className="tms-t2 mt1">{lookupResult}</p>}
        </GlassCard>

        <GlassCard title="Issue Darshan Token">
          <p className="tms-t3">Issue a queue token for the devotee above or a walk-in guest.</p>
          <Button onClick={handleIssueToken} disabled={busy} className="mt1">
            Issue Token
          </Button>
          {tokenResult && <p className="tms-t2 mt1">{tokenResult}</p>}
        </GlassCard>
      </div>
    </>
  );
}

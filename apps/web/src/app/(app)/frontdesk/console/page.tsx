'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, GlassCard, PageHeader } from '@tms/ui';
import {
  Currency,
  type DevoteeLookupMatch,
  type DevoteeLookupResult,
  type QueueToken,
  type QueueType,
} from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints, formatMoney } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import { CounterPosForm } from '@/components/CounterPosForm';
import styles from './console.module.css';

function isToday(value: string | Date): boolean {
  const d = typeof value === 'string' ? new Date(value) : value;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function FrontDeskConsolePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { api } = useTenant();
  const today = new Date().toISOString().slice(0, 10);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [lookup, setLookup] = useState<DevoteeLookupResult | null>(null);
  const [matches, setMatches] = useState<DevoteeLookupMatch[]>([]);
  const [selectedDevoteeId, setSelectedDevoteeId] = useState<string | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [lastToken, setLastToken] = useState<QueueToken | null>(null);
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [priorityToken, setPriorityToken] = useState(false);
  const [queueType, setQueueType] = useState<QueueType>('darshan');
  const [busy, setBusy] = useState(false);
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
  const posTotal =
    counterBookings.reduce((sum, b) => sum + b.amount, 0) +
    counterDonations.reduce((sum, d) => sum + d.amount, 0);
  const posCurrency = counterBookings[0]?.currency ?? counterDonations[0]?.currency ?? Currency.USD;

  async function refreshLookup() {
    const ep = createEndpoints(api);
    return ep.frontDeskLookup({
      phone: phone.trim() || undefined,
      name: name.trim() || undefined,
    });
  }

  function selectMatch(match: DevoteeLookupMatch, result?: DevoteeLookupResult) {
    setSelectedDevoteeId(match.id);
    setLookup({
      found: true,
      matches: result?.matches ?? matches,
      devotee: result?.devotee?.id === match.id ? result.devotee : { ...match },
    });
  }

  function clearGuest() {
    setLookup(null);
    setMatches([]);
    setSelectedDevoteeId(null);
    setPhone('');
    setName('');
    setLookupMessage(null);
    setTokenResult(null);
    setLastToken(null);
  }

  useEffect(() => {
    const devoteeId = searchParams.get('devoteeId');
    if (!devoteeId) return;

    let cancelled = false;
    (async () => {
      setBusy(true);
      setLookupMessage(null);
      try {
        const ep = createEndpoints(api);
        const profile = await ep.getDevoteeProfile(devoteeId);
        if (cancelled) return;

        const fullName = `${profile.firstName} ${profile.lastName}`;
        const match: DevoteeLookupMatch = {
          id: profile.id,
          name: fullName,
          phone: profile.phone,
          gotram: profile.gotram,
          nakshatra: profile.nakshatra,
          membershipTier: profile.membershipTier,
        };
        const lookupResult: DevoteeLookupResult = {
          found: true,
          matches: [match],
          devotee: {
            ...match,
            todayBookings: profile.todayBookings,
            ytdDonations: profile.ytdDonations,
          },
        };

        setPhone(profile.phone);
        setName(fullName);
        setMatches([match]);
        setSelectedDevoteeId(profile.id);
        setLookup(lookupResult);
      } catch (err) {
        if (!cancelled) {
          setLookupMessage(err instanceof Error ? err.message : 'Could not load devotee');
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, searchParams]);

  async function handleLookup() {
    if (!phone.trim() && !name.trim()) {
      setLookupMessage('Enter phone or name.');
      return;
    }
    setBusy(true);
    setLookup(null);
    setMatches([]);
    setSelectedDevoteeId(null);
    setLookupMessage(null);
    setTokenResult(null);
    setLastToken(null);
    setActionMsg(null);
    try {
      const result = await refreshLookup();
      setLookup(result);
      setMatches(result.matches ?? []);
      if (result.found && result.devotee) {
        setSelectedDevoteeId(result.devotee.id);
      } else {
        setLookupMessage('No match — add in Devotees.');
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
      setActionMsg('Checked in.');
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Check-in failed');
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
        queueType: priorityToken ? 'priority' : queueType,
        priority: priorityToken,
      });
      setLastToken(token);
      setTokenResult(`#${token.tokenNumber} · ~${token.estimatedWaitMinutes}m`);
      refetch();
      const guestName = encodeURIComponent(lookup?.devotee?.name ?? 'Walk-in guest');
      router.push(
        `/frontdesk/token-print?token=${encodeURIComponent(token.tokenNumber)}&position=${token.position}&wait=${token.estimatedWaitMinutes}&name=${guestName}`,
      );
    } catch (err) {
      setTokenResult(err instanceof Error ? err.message : 'Token failed');
    } finally {
      setBusy(false);
    }
  }

  const devotee = lookup?.devotee;
  const activeDevoteeId = selectedDevoteeId ?? devotee?.id ?? null;
  const ep = createEndpoints(api);
  const serviceList = services ?? [];

  return (
    <div className={styles.console}>
      <PageHeader
        title="Reception Console"
        subtitle="Look up a guest, then book or checkout"
        actions={
          <div className={styles.actionBar}>
            <Button size="sm" variant="outline" onClick={() => router.push('/frontdesk/devotees')}>
              Devotees
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push('/frontdesk/queue')}>
              Queue
            </Button>
          </div>
        }
      />

      <ApiBanner loading={loading || posLoading} error={error ?? posError} />

      <div className={styles.statsStrip}>
        <span className={styles.statItem}>
          🎫 <strong>{stats?.inQueue ?? 0}</strong> waiting
        </span>
        <span className={styles.statDivider}>·</span>
        <span className={styles.statItem}>
          ⏱ <strong>{stats?.averageWaitMinutes ?? 0}m</strong> avg
        </span>
        <span className={styles.statDivider}>·</span>
        <span className={styles.statItem}>
          ✅ <strong>{stats?.servedToday ?? 0}</strong> served
        </span>
        <span className={styles.statDivider}>·</span>
        <span className={styles.statItem}>
          🧾 <strong>{formatMoney(posTotal, posCurrency)}</strong> POS today
        </span>
        <span className={styles.statDivider}>·</span>
        <Link href="/frontdesk/display" className={styles.hint}>
          Display board →
        </Link>
      </div>

      <section className={styles.topPanel}>
        <div className={styles.lookupStrip}>
          <div className="formGroup">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 615-555-0211"
            />
          </div>
          <div className="formGroup">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Raj Natarajan"
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            />
          </div>
          <Button size="sm" onClick={handleLookup} disabled={busy || (!phone.trim() && !name.trim())}>
            Look up
          </Button>
          <div className={styles.tokenInline}>
            <div className="formGroup">
              <label htmlFor="queueType">Token</label>
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
            <Button size="sm" variant="outline" onClick={handleIssueToken} disabled={busy}>
              Issue
            </Button>
            <label className={styles.vipCheck}>
              <input
                type="checkbox"
                checked={priorityToken}
                onChange={(e) => setPriorityToken(e.target.checked)}
              />
              VIP
            </label>
          </div>
        </div>

        {lookupMessage && (
          <p className={[styles.statusMsg, devotee ? styles.statusMsgOk : ''].filter(Boolean).join(' ')}>
            {lookupMessage}
          </p>
        )}
        {tokenResult && <p className={styles.statusMsg}>{tokenResult}</p>}

        {matches.length > 1 && (
          <div className={styles.matchList}>
            {matches.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`${styles.matchItem} ${activeDevoteeId === m.id ? styles.matchItemActive : ''}`}
                onClick={() => selectMatch(m, lookup ?? undefined)}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        {activeDevoteeId && devotee && (
          <div className={styles.guestBar}>
            <div>
              <strong>{devotee.name}</strong>
              <div className={styles.guestMeta}>
                {devotee.phone}
                {devotee.gotram ? ` · ${devotee.gotram}` : ''}
                {devotee.nakshatra ? ` · ${devotee.nakshatra}` : ''}
              </div>
            </div>
            {devotee.todayBookings && devotee.todayBookings.length > 0 && (
              <div className={styles.todayInline}>
                {devotee.todayBookings.map((b) => (
                  <span key={b.id} className={styles.todayPill}>
                    {new Date(b.scheduledAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {b.checkedIn ? ' ✓' : ''}
                    {!b.checkedIn && (
                      <button
                        type="button"
                        className={styles.matchItem}
                        onClick={() => handleCheckIn(b.id)}
                        disabled={busy}
                      >
                        Check in
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            <div className={styles.guestActions}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/frontdesk/devotees?id=${activeDevoteeId}`)}
              >
                Profile
              </Button>
              <Button size="sm" variant="outline" onClick={clearGuest}>
                Clear
              </Button>
            </div>
          </div>
        )}
      </section>

      {devotee && serviceList.length > 0 ? (
        <GlassCard compact title="Counter POS" className={styles.posPanel}>
          <CounterPosForm
            ep={ep}
            devotee={devotee}
            services={serviceList}
            onSuccess={(msg) => {
              setActionMsg(msg);
              refetchPos();
            }}
            onError={(msg) => setActionMsg(msg)}
          />
        </GlassCard>
      ) : (
        <div className={styles.emptyState}>
          Look up a devotee to open booking, sales, and donations.
        </div>
      )}

      {actionMsg && <p className={[styles.statusMsg, styles.statusMsgOk].join(' ')}>{actionMsg}</p>}
    </div>
  );
}

export default function FrontDeskConsolePage() {
  return (
    <Suspense fallback={<p className="tms-t2">Loading…</p>}>
      <FrontDeskConsolePageInner />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import { Badge, Button, DataTable, GlassCard, StatTile } from '@tms/ui';
import type { QueueToken, QueueType } from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './queue.module.css';

export default function FrontDeskQueuePage() {
  const { api } = useTenant();
  const [queueType, setQueueType] = useState<QueueType | ''>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (ep) =>
      ep.getFrontDeskQueue({
        status: 'waiting',
        queueType: queueType || undefined,
      }),
    [queueType],
  );

  const { data: called } = useApi((ep) => ep.getFrontDeskQueue({ status: 'called' }));
  const { data: stats } = useApi((ep) => ep.getQueueStats());

  const waiting = data?.data ?? [];
  const calledTokens = called?.data ?? [];

  async function handleCallNext() {
    setBusy(true);
    setMsg(null);
    try {
      const ep = createEndpoints(api);
      const res = await ep.callNextToken(queueType || undefined);
      if (!res.data) {
        setMsg('No tokens waiting.');
      } else {
        setMsg(`Called ${res.data.tokenNumber}${res.data.devoteeName ? ` — ${res.data.devoteeName}` : ''}`);
      }
      refetch();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Call failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleServe(id: string) {
    setBusy(true);
    try {
      const ep = createEndpoints(api);
      await ep.serveQueueToken(id);
      refetch();
    } finally {
      setBusy(false);
    }
  }

  const rows = waiting.map((t: QueueToken) => ({
    id: t.id,
    token: t.tokenNumber,
    name: t.devoteeName ?? '—',
    position: String(t.position),
    wait: `~${t.estimatedWaitMinutes}m`,
    type: t.priority ? 'VIP' : (t.queueType ?? 'darshan'),
    priority: t.priority,
  }));

  return (
    <div className={styles.queue}>
      <PageIntro
        subtitle="Call next · mark served"
        actions={
          <Button size="sm" onClick={handleCallNext} disabled={busy}>
            Call next
          </Button>
        }
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.toolbar}>
        <div className={styles.stats}>
          <StatTile compact accent="amber" label="Waiting" value={String(stats?.inQueue ?? waiting.length)} icon="🎫" />
          <StatTile compact accent="blue" label="Calling" value={String(stats?.calledNow ?? calledTokens.length)} icon="📢" />
          <StatTile compact accent="green" label="Served" value={String(stats?.servedToday ?? 0)} icon="✅" />
        </div>
        <select
          className={styles.filterSelect}
          value={queueType}
          onChange={(e) => setQueueType(e.target.value as QueueType | '')}
          aria-label="Queue type"
        >
          <option value="">All queues</option>
          <option value="darshan">Darshan</option>
          <option value="seva">Seva</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      {calledTokens.length > 0 && (
        <div className={styles.callingPanel}>
          {calledTokens.map((t) => (
            <div key={t.id} className={styles.callingChip}>
              <strong>{t.tokenNumber}</strong>
              <span>{t.devoteeName ?? 'Guest'}</span>
              <Button variant="outline" size="sm" onClick={() => handleServe(t.id)} disabled={busy}>
                Served
              </Button>
            </div>
          ))}
        </div>
      )}

      <GlassCard compact title="Waiting" noBodyPadding>
        <DataTable
          getRowKey={(r) => r.id}
          columns={[
            { key: 'token', header: 'Token', render: (r) => r.token },
            { key: 'name', header: 'Devotee', render: (r) => r.name },
            {
              key: 'type',
              header: 'Type',
              render: (r) => <Badge variant={r.priority ? 'pending' : 'ok'}>{r.type}</Badge>,
            },
            { key: 'position', header: '#', render: (r) => r.position },
            { key: 'wait', header: 'Wait', render: (r) => r.wait },
          ]}
          data={rows}
        />
      </GlassCard>
      {msg && <p className={styles.statusMsg}>{msg}</p>}
    </div>
  );
}

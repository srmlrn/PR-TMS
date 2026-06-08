'use client';

import Link from 'next/link';
import { Badge, GlassCard, PageHeader, StatTile } from '@tms/ui';
import type { CommitteeRequest, CommitteeTask } from '@tms/types';
import { createEndpoints, formatShortDate } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';

export default function CommitteeDashboardPage() {
  const { data, loading, error } = useApi((ep) => ep.getCommitteeDashboard());
  const dashboard = data;

  return (
    <>
      <PageHeader
        title="Committee Dashboard"
        subtitle="Your committees, tasks, and pending approvals"
      />
      <ApiBanner loading={loading} error={error} />

      {dashboard && (
        <>
          <div className="statGrid mb2">
            <StatTile label="My committees" value={dashboard.stats.totalCommittees} />
            <StatTile label="Open tasks" value={dashboard.stats.openTasks} />
            <StatTile label="Pending approvals" value={dashboard.stats.pendingRequests} />
            <StatTile label="Upcoming blocks" value={dashboard.stats.upcomingBlocks} />
          </div>

          <div className="grid2 mb2">
            <GlassCard title="My committees" compact>
              {dashboard.committees.map((c) => (
                <div key={c.id} className="mb1">
                  <strong>{c.name}</strong>
                  <p className="hint">{c.purpose ?? c.description}</p>
                </div>
              ))}
              {dashboard.committees.length === 0 && (
                <p className="hint">You are not assigned to any committee.</p>
              )}
            </GlassCard>

            <GlassCard title="My open tasks" compact>
              {dashboard.myTasks.slice(0, 5).map((t: CommitteeTask) => (
                <div key={t.id} className="flexRow mb1" style={{ justifyContent: 'space-between' }}>
                  <span>{t.title}</span>
                  <Badge variant={t.priority === 'high' ? 'error' : 'pending'}>{t.status}</Badge>
                </div>
              ))}
              {dashboard.myTasks.length > 0 && (
                <Link href="/committee/tasks" className="hint">
                  View all tasks →
                </Link>
              )}
              {dashboard.myTasks.length === 0 && <p className="hint">No open tasks</p>}
            </GlassCard>
          </div>

          <div className="grid2">
            <GlassCard title="Pending approvals" compact>
              {dashboard.pendingApprovals.length === 0 ? (
                <p className="hint">No pending approvals</p>
              ) : (
                dashboard.pendingApprovals.map((r: CommitteeRequest) => (
                  <div key={r.id} className="mb1">
                    <strong>{r.title}</strong>
                    <p className="hint">
                      {r.type} · {r.requestedByName ?? 'Member'}
                    </p>
                  </div>
                ))
              )}
              {dashboard.pendingApprovals.length > 0 && (
                <Link href="/committee/requests" className="hint">
                  Review requests →
                </Link>
              )}
            </GlassCard>

            <GlassCard title="Upcoming calendar blocks" compact>
              {dashboard.upcomingBlocks.map((b) => (
                <div key={b.id} className="mb1">
                  <strong>{b.title}</strong>
                  <p className="hint">
                    {formatShortDate(b.startDate)}
                    {b.startDate !== b.endDate && ` – ${formatShortDate(b.endDate)}`}
                  </p>
                </div>
              ))}
              {dashboard.upcomingBlocks.length === 0 && (
                <p className="hint">No upcoming blocks</p>
              )}
              <Link href="/committee/calendar" className="hint">
                View calendar →
              </Link>
            </GlassCard>
          </div>
        </>
      )}
    </>
  );
}

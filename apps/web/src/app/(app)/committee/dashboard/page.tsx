'use client';

import Link from 'next/link';
import { Badge, GlassCard } from '@tms/ui';
import type { CommitteeRequest, CommitteeTask } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { PageStats } from '@/components/PageStats';
import { formatShortDate } from '@/lib/api/endpoints';
import { demoCommitteeDashboard } from '@/lib/demo-fallbacks';
import { useApi } from '@/lib/api/use-api';
import { useTenantSite } from '@/lib/tenant-site';

export default function CommitteeDashboardPage() {
  const site = useTenantSite();
  const { data, loading, error } = useApi((ep) => ep.getCommitteeDashboard());
  const dashboard = data ?? (error ? demoCommitteeDashboard(site.name) : null);

  return (
    <AppPage
      subtitle="Your committees, tasks, and pending approvals"
      loading={loading}
      error={error}
      showTenantContext={false}
    >
      {dashboard && (
        <>
          <PageStats
            items={[
              { icon: '🏛️', label: 'My committees', value: dashboard.stats.totalCommittees, accent: 'green' },
              { icon: '✅', label: 'Open tasks', value: dashboard.stats.openTasks, accent: 'amber' },
              { icon: '📋', label: 'Pending approvals', value: dashboard.stats.pendingRequests, accent: 'blue' },
              { icon: '📅', label: 'Upcoming blocks', value: dashboard.stats.upcomingBlocks, accent: 'red' },
            ]}
          />

          <div className="grid2">
            <GlassCard title="My committees" compact>
              {dashboard.committees.length === 0 ? (
                <p className="hint">You are not assigned to any committee.</p>
              ) : (
                dashboard.committees.map((c) => (
                  <div key={c.id} className="listRow">
                    <div className="listRowMain">
                      <div className="listRowTitle">{c.name}</div>
                      <p className="hint">{c.purpose ?? c.description}</p>
                    </div>
                  </div>
                ))
              )}
            </GlassCard>

            <GlassCard title="My open tasks" compact>
              {dashboard.myTasks.length === 0 ? (
                <p className="hint">No open tasks</p>
              ) : (
                dashboard.myTasks.slice(0, 5).map((t: CommitteeTask) => (
                  <div key={t.id} className="listRow">
                    <div className="listRowMain">
                      <div className="listRowTitle">{t.title}</div>
                    </div>
                    <Badge variant={t.priority === 'high' ? 'error' : 'pending'}>{t.status}</Badge>
                  </div>
                ))
              )}
              {dashboard.myTasks.length > 0 && (
                <Link href="/committee/tasks" className="cardLink">
                  View all tasks →
                </Link>
              )}
            </GlassCard>

            <GlassCard title="Pending approvals" compact>
              {dashboard.pendingApprovals.length === 0 ? (
                <p className="hint">No pending approvals</p>
              ) : (
                dashboard.pendingApprovals.map((r: CommitteeRequest) => (
                  <div key={r.id} className="listRow">
                    <div className="listRowMain">
                      <div className="listRowTitle">{r.title}</div>
                      <p className="hint">
                        {r.type.replace('_', ' ')} · {r.requestedByName ?? 'Member'}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {dashboard.pendingApprovals.length > 0 && (
                <Link href="/committee/requests" className="cardLink">
                  Review requests →
                </Link>
              )}
            </GlassCard>

            <GlassCard title="Upcoming calendar blocks" compact>
              {dashboard.upcomingBlocks.length === 0 ? (
                <p className="hint">No upcoming blocks</p>
              ) : (
                dashboard.upcomingBlocks.map((b) => (
                  <div key={b.id} className="listRow">
                    <div className="listRowMain">
                      <div className="listRowTitle">{b.title}</div>
                      <p className="hint">
                        {formatShortDate(b.startDate)}
                        {b.startDate !== b.endDate && ` – ${formatShortDate(b.endDate)}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <Link href="/committee/calendar" className="cardLink">
                View calendar →
              </Link>
            </GlassCard>
          </div>
        </>
      )}
    </AppPage>
  );
}

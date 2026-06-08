'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, GlassCard } from '@tms/ui';
import type { CommitteeRequest, CommitteeTask } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { PersonRow } from '@/components/PersonAvatar';
import { PageStats } from '@/components/PageStats';
import { formatShortDate } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { useCommitteeScope } from '@/lib/use-committee-scope';

export default function CommitteeWorkspacePage() {
  const params = useParams<{ committeeId: string }>();
  const committeeId = params.committeeId;
  const { setActiveCommitteeId, committees } = useCommitteeScope();

  useEffect(() => {
    if (committeeId && committees.some((c) => c.id === committeeId)) {
      setActiveCommitteeId(committeeId);
    }
  }, [committeeId, committees, setActiveCommitteeId]);

  const { data: committee, loading: committeeLoading, error: committeeError } = useApi(
    (ep) => ep.getCommittee(committeeId),
    [committeeId],
  );

  const { data: dashboard, loading: dashLoading, error: dashError } = useApi(
    (ep) => ep.getCommitteeDashboardFor(committeeId),
    [committeeId],
  );

  const { data: membersData, loading: membersLoading } = useApi(
    (ep) => ep.getCommitteeMembers(committeeId),
    [committeeId],
  );

  const loading = committeeLoading || dashLoading || membersLoading;
  const error = committeeError ?? dashError;
  const members = membersData?.data ?? [];

  return (
    <AppPage
      subtitle={committee?.purpose ?? committee?.description ?? 'Committee workspace'}
      loading={loading}
      error={error}
      showTenantContext={false}
    >
      {committee && dashboard && (
        <>
          <div className="flexRow mb2" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <Badge variant="info">{committee.category}</Badge>
            <Badge variant="pending">{committee.committeeType.replace('_', ' ')}</Badge>
            {committee.meetingCadence && (
              <Badge variant="ok">{committee.meetingCadence} meetings</Badge>
            )}
            {committee.myDisplayTitle && (
              <Badge variant="ok">Your role: {committee.myDisplayTitle}</Badge>
            )}
          </div>

          <PageStats
            items={[
              { icon: '👥', label: 'Members', value: members.length, accent: 'green' },
              { icon: '✅', label: 'Your open tasks', value: dashboard.stats.openTasks, accent: 'amber' },
              {
                icon: '📋',
                label: 'Pending approvals',
                value: dashboard.stats.pendingRequests,
                accent: 'blue',
              },
              {
                icon: '📅',
                label: 'Upcoming blocks',
                value: dashboard.stats.upcomingBlocks,
                accent: 'red',
              },
            ]}
          />

          <div className="grid2">
            <GlassCard title="Quick links" compact>
              <div className="formStack">
                <Link href="/committee/tasks" className="cardLink">
                  My tasks →
                </Link>
                <Link href="/committee/approvals" className="cardLink">
                  Pending approvals →
                </Link>
                <Link href="/committee/requests" className="cardLink">
                  Submit a request →
                </Link>
                <Link href="/committee/calendar" className="cardLink">
                  Calendar blocks →
                </Link>
                <Link href="/committee/messages" className="cardLink">
                  Messages →
                </Link>
                <Link href="/committee/reports" className="cardLink">
                  Reports →
                </Link>
              </div>
            </GlassCard>

            <GlassCard title="Your open tasks" compact>
              {dashboard.myTasks.length === 0 ? (
                <p className="hint">No open tasks in this committee.</p>
              ) : (
                dashboard.myTasks.slice(0, 5).map((t: CommitteeTask) => (
                  <div key={t.id} className="listRow">
                    <div className="listRowMain">
                      <div className="listRowTitle">{t.title}</div>
                      {t.dueDate && <p className="hint">Due {formatShortDate(t.dueDate)}</p>}
                    </div>
                    <Badge variant="pending">{t.status}</Badge>
                  </div>
                ))
              )}
            </GlassCard>

            <GlassCard title="Pending approvals" compact>
              {dashboard.pendingApprovals.length === 0 ? (
                <p className="hint">No pending approvals.</p>
              ) : (
                dashboard.pendingApprovals.map((r: CommitteeRequest) => (
                  <div key={r.id} className="listRow">
                    <div className="listRowMain">
                      <div className="listRowTitle">{r.title}</div>
                      <p className="hint">{r.requestedByName ?? 'Member'}</p>
                    </div>
                  </div>
                ))
              )}
              <Link href="/committee/approvals" className="cardLink">
                Review approvals →
              </Link>
            </GlassCard>

            <GlassCard title="Members" compact>
              {members.slice(0, 8).map((m) => (
                <PersonRow
                  key={m.id}
                  name={m.name}
                  photoUrl={m.photoUrl}
                  subtitle={m.displayTitle ?? m.role.replace('_', ' ')}
                  size="sm"
                />
              ))}
              {members.length > 8 && (
                <p className="hint">+{members.length - 8} more members</p>
              )}
              <Link href="/committee/directory" className="cardLink">
                Full temple directory →
              </Link>
            </GlassCard>
          </div>
        </>
      )}
    </AppPage>
  );
}

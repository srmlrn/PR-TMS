'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@tms/ui';
import type { Committee, CommitteeRequest, CommitteeTask, CommitteeTaskStatus } from '@tms/types';
import { useAuth } from '@/lib/auth-context';
import { AppPage } from '@/components/AppPage';
import { createEndpoints, formatShortDate } from '@/lib/api/endpoints';
import { demoCommitteeDashboard } from '@/lib/demo-fallbacks';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import { useTenantSite } from '@/lib/tenant-site';
import { useCommitteeScope } from '@/lib/use-committee-scope';
import { nextStatusActions } from '../tasks/tasks-utils';
import styles from './dashboard.module.css';

type DashTab = 'overview' | 'tasks' | 'approvals' | 'calendar';

const TABS: { id: DashTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'calendar', label: 'Calendar' },
];

function statusClass(task: CommitteeTask): string {
  return task.priority === 'high'
    ? `${styles.statusPill} ${styles.statusHigh}`
    : styles.statusPill;
}

function Panel({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{title}</h2>
        {href && linkLabel && (
          <Link href={href} className={styles.panelLink}>
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function CommitteeDashboardPage() {
  const site = useTenantSite();
  const { api } = useTenant();
  const { user } = useAuth();
  const { scopeParams, scopeLabel, committeeName, isAllCommittees, activeCommittee } =
    useCommitteeScope();
  const [tab, setTab] = useState<DashTab>('overview');
  const [actionId, setActionId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (ep) => ep.getCommitteeDashboard(scopeParams),
    [scopeParams.committeeId],
  );
  const dashboard = data ?? (error ? demoCommitteeDashboard(site.name) : null);

  async function updateTask(
    task: CommitteeTask,
    patch: { status?: CommitteeTaskStatus },
  ) {
    setActionId(task.id);
    setMsg(null);
    try {
      await createEndpoints(api).updateCommitteeTask(task.committeeId, task.id, patch);
      setMsg('Task updated.');
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  }

  async function review(request: CommitteeRequest, status: 'approved' | 'rejected') {
    setActionId(request.id);
    setMsg(null);
    try {
      await createEndpoints(api).updateCommitteeRequest(request.committeeId, request.id, {
        status,
      });
      setMsg(`Request ${status}.`);
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  }

  function tabCount(id: DashTab): number | null {
    if (!dashboard) return null;
    if (id === 'tasks') return dashboard.stats.openTasks;
    if (id === 'approvals') return dashboard.stats.pendingRequests;
    if (id === 'calendar') return dashboard.stats.upcomingBlocks;
    return null;
  }

  return (
    <AppPage subtitle={scopeLabel} loading={loading} error={error} showTenantContext={false}>
      {dashboard && (
        <>
          <div className={styles.statStrip}>
            {isAllCommittees && (
              <>
                <button
                  type="button"
                  className={styles.statBtn}
                  onClick={() => setTab('overview')}
                >
                  <strong>{dashboard.stats.totalCommittees}</strong> committees
                </button>
                <span className={styles.statDot}>·</span>
              </>
            )}
            <button type="button" className={styles.statBtn} onClick={() => setTab('tasks')}>
              <strong>{dashboard.stats.openTasks}</strong> tasks
            </button>
            <span className={styles.statDot}>·</span>
            <button type="button" className={styles.statBtn} onClick={() => setTab('approvals')}>
              <strong>{dashboard.stats.pendingRequests}</strong> approvals
            </button>
            <span className={styles.statDot}>·</span>
            <button type="button" className={styles.statBtn} onClick={() => setTab('calendar')}>
              <strong>{dashboard.stats.upcomingBlocks}</strong> blocks
            </button>
          </div>

          <div className={styles.tabBar}>
            {TABS.map((t) => {
              const count = tabCount(t.id);
              return (
                <Button
                  key={t.id}
                  size="sm"
                  variant={tab === t.id ? 'primary' : 'outline'}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                  {count != null && count > 0 && t.id !== 'overview' && (
                    <span className={styles.tabBadge}>{count}</span>
                  )}
                </Button>
              );
            })}
          </div>

          {msg && <p className={styles.flash}>{msg}</p>}

          {tab === 'overview' && (
            <Panel title={isAllCommittees ? 'My committees' : 'Workspace'}>
              {isAllCommittees ? (
                dashboard.committees.length === 0 ? (
                  <p className={styles.empty}>None assigned</p>
                ) : (
                  <div className={styles.committeeChips}>
                    {dashboard.committees.map((c: Committee) => (
                      <Link key={c.id} href={`/committee/${c.id}`} className={styles.committeeChip}>
                        {c.name}
                        {c.myDisplayTitle && (
                          <span className={styles.committeeChipRole}> · {c.myDisplayTitle}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )
              ) : (
                <div className={styles.overviewSingle}>
                  {activeCommittee?.myDisplayTitle && (
                    <span className={styles.rolePill}>{activeCommittee.myDisplayTitle}</span>
                  )}
                  <Link href={`/committee/${activeCommittee?.id}`} className={styles.panelLink}>
                    Open workspace →
                  </Link>
                </div>
              )}
            </Panel>
          )}

          {tab === 'tasks' && (
            <Panel title="Task board" href="/committee/tasks" linkLabel="Full board">
              <div className={styles.boardStrip}>
                {(
                  [
                    ['available', 'Open pool', dashboard.taskBoard.counts.available],
                    ['todo', 'To do', dashboard.taskBoard.counts.todo],
                    ['in_progress', 'In progress', dashboard.taskBoard.counts.in_progress],
                    ['blocked', 'Blocked', dashboard.taskBoard.counts.blocked],
                  ] as const
                ).map(([key, label, count]) => (
                  <div key={key} className={styles.boardChip}>
                    <span className={styles.boardChipCount}>{count}</span>
                    <span className={styles.boardChipLabel}>{label}</span>
                  </div>
                ))}
              </div>
              {dashboard.taskBoard.openPool.length > 0 && (
                <>
                  <p className={styles.boardSectionLabel}>Pick up open work</p>
                  <div className={styles.rows}>
                    {dashboard.taskBoard.openPool.map((t: CommitteeTask) => (
                      <div key={t.id} className={styles.row}>
                        <div className={styles.rowMain}>
                          <div className={styles.rowTitle}>{t.title}</div>
                          {isAllCommittees && (
                            <div className={styles.rowMeta}>{committeeName(t.committeeId)}</div>
                          )}
                        </div>
                        <span className={styles.statusPill}>open</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {dashboard.myTasks.length > 0 && (
                <>
                  <p className={styles.boardSectionLabel}>Your active tasks</p>
                  <div className={styles.rows}>
                    {dashboard.myTasks.slice(0, 5).map((t: CommitteeTask) => {
                      const actions = nextStatusActions(t, user ?? undefined).slice(0, 1);
                      return (
                        <div key={t.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <div className={styles.rowTitle}>{t.title}</div>
                            {isAllCommittees && (
                              <div className={styles.rowMeta}>{committeeName(t.committeeId)}</div>
                            )}
                          </div>
                          <div className={styles.approvalActions}>
                            {actions.map((a) => (
                              <Button
                                key={a.status}
                                size="sm"
                                variant="outline"
                                disabled={actionId === t.id}
                                onClick={() => void updateTask(t, { status: a.status })}
                              >
                                {a.label}
                              </Button>
                            ))}
                            <span className={statusClass(t)}>{t.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {dashboard.taskBoard.openPool.length === 0 && dashboard.myTasks.length === 0 && (
                <p className={styles.empty}>No open work</p>
              )}
            </Panel>
          )}

          {tab === 'approvals' && (
            <Panel title="Pending approvals" href="/committee/approvals" linkLabel="Full page">
              {dashboard.pendingApprovals.length === 0 ? (
                <p className={styles.empty}>Nothing awaiting your review</p>
              ) : (
                <div className={styles.approvalList}>
                  {dashboard.pendingApprovals.map((r: CommitteeRequest) => (
                    <div key={r.id} className={styles.approvalRow}>
                      <div className={styles.rowMain}>
                        <div className={styles.rowTitle}>{r.title}</div>
                        <div className={styles.rowMeta}>
                          {isAllCommittees && `${committeeName(r.committeeId)} · `}
                          {r.type.replace('_', ' ')} · {r.requestedByName ?? 'Member'} ·{' '}
                          {formatShortDate(r.createdAt)}
                          {r.blockStartDate && r.blockEndDate && (
                            <> · {r.blockStartDate}–{r.blockEndDate}</>
                          )}
                        </div>
                      </div>
                      <div className={styles.approvalActions}>
                        <Button
                          size="sm"
                          disabled={actionId === r.id}
                          onClick={() => void review(r, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === r.id}
                          onClick={() => void review(r, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {tab === 'calendar' && (
            <Panel title="Upcoming blocks" href="/committee/calendar" linkLabel="Full calendar">
              {dashboard.upcomingBlocks.length === 0 ? (
                <p className={styles.empty}>None</p>
              ) : (
                <div className={styles.rows}>
                  {dashboard.upcomingBlocks.map((b) => (
                    <div key={b.id} className={styles.row}>
                      <div className={styles.rowMain}>
                        <div className={styles.rowTitle}>{b.title}</div>
                        <div className={styles.rowMeta}>
                          {isAllCommittees && `${committeeName(b.committeeId)} · `}
                          {formatShortDate(b.startDate)}
                          {b.startDate !== b.endDate && `–${formatShortDate(b.endDate)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}
        </>
      )}
    </AppPage>
  );
}

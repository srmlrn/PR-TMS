'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button } from '@tms/ui';
import type { CommitteeTask, CommitteeTaskStatus } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { createEndpoints } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth-context';
import { demoCommitteeDashboard } from '@/lib/demo-fallbacks';
import { useTenant } from '@/lib/tenant-context';
import { useTenantSite } from '@/lib/tenant-site';
import { useApi } from '@/lib/api/use-api';
import { useCommitteeScope } from '@/lib/use-committee-scope';
import {
  BOARD_COLUMNS,
  formatTaskDueDate,
  groupBoardTasks,
  nextStatusActions,
  type BoardColumnId,
} from './tasks-utils';
import styles from './tasks.module.css';

export default function CommitteeTasksPage() {
  const site = useTenantSite();
  const { api } = useTenant();
  const { user } = useAuth();
  const { scopeParams, scopeSubtitle, committeeName } = useCommitteeScope();
  const [showDone, setShowDone] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (ep) => ep.getMyCommitteeBoardTasks(scopeParams),
    [scopeParams.committeeId],
  );
  const allTasks = useMemo(() => {
    if (data?.data) return data.data;
    if (error) {
      const demo = demoCommitteeDashboard(site.name);
      return [...demo.myTasks, ...demo.taskBoard.openPool];
    }
    return [];
  }, [data?.data, error, site.name]);

  const columns = useMemo(
    () => groupBoardTasks(allTasks, showDone),
    [allTasks, showDone],
  );

  async function runTaskAction(
    task: CommitteeTask,
    patch: { status?: CommitteeTaskStatus; assigneeUserId?: string; assigneeName?: string },
  ) {
    setActionId(task.id);
    try {
      const ep = createEndpoints(api);
      await ep.updateCommitteeTask(task.committeeId, task.id, patch);
      await refetch();
    } finally {
      setActionId(null);
    }
  }

  function pickup(task: CommitteeTask) {
    if (!user) return;
    void runTaskAction(task, {
      assigneeUserId: user.id,
      assigneeName: user.name,
      status: 'in_progress',
    });
  }

  function renderCard(task: CommitteeTask, column: BoardColumnId) {
    const isMine = task.assigneeUserId === user?.id;
    const actions = nextStatusActions(task, user?.id);

    return (
      <article key={task.id} className={styles.card}>
        <h3 className={styles.cardTitle}>{task.title}</h3>
        <p className={styles.cardMeta}>{committeeName(task.committeeId)}</p>
        {task.description && <p className={styles.cardDesc}>{task.description}</p>}
        {task.dueDate && (
          <p className={styles.cardMeta}>
            Due {formatTaskDueDate(task.dueDate)}
          </p>
        )}
        <div className={styles.cardTags}>
          <Badge variant={task.priority === 'high' ? 'error' : 'info'}>{task.priority}</Badge>
          {task.assigneeName ? (
            <Badge variant="pending">{task.assigneeName}</Badge>
          ) : (
            <Badge variant="ok">Unassigned</Badge>
          )}
        </div>
        <div className={styles.cardActions}>
          {column === 'available' && (
            <Button
              size="sm"
              disabled={actionId === task.id}
              onClick={() => pickup(task)}
            >
              Pick up
            </Button>
          )}
          {isMine &&
            actions.map((a) => (
              <Button
                key={a.status}
                size="sm"
                variant="outline"
                disabled={actionId === task.id}
                onClick={() => void runTaskAction(task, { status: a.status })}
              >
                {a.label}
              </Button>
            ))}
        </div>
      </article>
    );
  }

  return (
    <AppPage subtitle={scopeSubtitle} loading={loading} error={error} showTenantContext={false}>
      <div className={styles.toolbar}>
        <p className="hint" style={{ margin: 0 }}>
          Pick up open work, track progress, and flag blockers. Discuss tasks in{' '}
          <Link href="/committee/messages">Messages</Link>.
        </p>
        <label className="flexRow tms-t3" style={{ gap: '0.35rem' }}>
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
          />
          Show completed
        </label>
      </div>

      <div className={styles.board}>
        {BOARD_COLUMNS.map((col) => {
          if (!showDone && col.id === 'done') return null;
          const items = columns[col.id];
          return (
            <section key={col.id} className={styles.column}>
              <div className={styles.columnHead}>
                <div className={styles.columnTitle}>
                  <span>{col.label}</span>
                  <span className={styles.columnCount}>{items.length}</span>
                </div>
                <p className={styles.columnHint}>{col.hint}</p>
              </div>
              <div className={styles.columnBody}>
                {items.length === 0 ? (
                  <p className={styles.emptyCol}>—</p>
                ) : (
                  items.map((task) => renderCard(task, col.id))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </AppPage>
  );
}

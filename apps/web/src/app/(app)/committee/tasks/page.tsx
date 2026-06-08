'use client';

import { useState } from 'react';
import { Badge, Button, GlassCard } from '@tms/ui';
import type { CommitteeTask, CommitteeTaskStatus } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { createEndpoints, formatShortDate } from '@/lib/api/endpoints';
import { demoCommitteeDashboard } from '@/lib/demo-fallbacks';
import { useTenant } from '@/lib/tenant-context';
import { useTenantSite } from '@/lib/tenant-site';
import { useApi } from '@/lib/api/use-api';

const STATUS_OPTIONS: CommitteeTaskStatus[] = ['todo', 'in_progress', 'done', 'blocked'];

export default function CommitteeTasksPage() {
  const site = useTenantSite();
  const { api } = useTenant();
  const [actionId, setActionId] = useState<string | null>(null);
  const { data, loading, error, refetch } = useApi((ep) => ep.getMyCommitteeTasks());
  const tasks =
    data?.data ?? (error ? demoCommitteeDashboard(site.name).myTasks : []);

  async function updateStatus(task: CommitteeTask, status: CommitteeTaskStatus) {
    setActionId(task.id);
    try {
      const ep = createEndpoints(api);
      await ep.updateCommitteeTask(task.committeeId, task.id, { status });
      await refetch();
    } finally {
      setActionId(null);
    }
  }

  return (
    <AppPage
      title="My Tasks"
      subtitle="Tasks assigned to you across committees"
      loading={loading}
      error={error}
      showTenantContext={false}
    >
      <GlassCard title={`Assigned tasks (${tasks.length})`} compact>
        {tasks.length === 0 ? (
          <p className="hint">No tasks assigned to you.</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="mb2"
              style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}
            >
              <div className="flexRow" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong>{task.title}</strong>
                  {task.description && <p className="hint">{task.description}</p>}
                  {task.dueDate && (
                    <p className="hint">Due {formatShortDate(task.dueDate)}</p>
                  )}
                </div>
                <div className="flexRow" style={{ gap: '0.25rem', alignItems: 'center' }}>
                  <Badge variant={task.priority === 'high' ? 'error' : 'info'}>
                    {task.priority}
                  </Badge>
                  <Badge variant={task.status === 'done' ? 'ok' : 'pending'}>
                    {task.status}
                  </Badge>
                </div>
              </div>
              {task.status !== 'done' && (
                <div className="flexRow mt1" style={{ gap: '0.25rem', flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.filter((s) => s !== task.status).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      disabled={actionId === task.id}
                      onClick={() => void updateStatus(task, s)}
                    >
                      Mark {s.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </GlassCard>
    </AppPage>
  );
}

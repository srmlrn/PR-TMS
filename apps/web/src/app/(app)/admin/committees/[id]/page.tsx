'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Badge,
  Button,
  DataTable,
  GlassCard,
  ProgressBar,
} from '@tms/ui';
import type {
  Committee,
  CommitteeCalendarBlock,
  CommitteeMember,
  CommitteeMessage,
  CommitteeRequest,
  CommitteeTarget,
  CommitteeTask,
  CreateCommitteeCalendarBlockInput,
  CreateCommitteeMemberInput,
  CreateCommitteeMessageInput,
  CreateCommitteeRequestInput,
  CreateCommitteeTargetInput,
  CreateCommitteeTaskInput,
} from '@tms/types';
import { createEndpoints, formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';

type Tab =
  | 'overview'
  | 'members'
  | 'calendar'
  | 'tasks'
  | 'targets'
  | 'requests'
  | 'messages';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'calendar', label: 'Calendar blocks' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'targets', label: 'Targets' },
  { id: 'requests', label: 'Requests' },
  { id: 'messages', label: 'Messages' },
];

export default function AdminCommitteeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useTenant();
  const [tab, setTab] = useState<Tab>('overview');
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [blocks, setBlocks] = useState<CommitteeCalendarBlock[]>([]);
  const [tasks, setTasks] = useState<CommitteeTask[]>([]);
  const [targets, setTargets] = useState<CommitteeTarget[]>([]);
  const [requests, setRequests] = useState<CommitteeRequest[]>([]);
  const [messages, setMessages] = useState<CommitteeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [memberForm, setMemberForm] = useState<CreateCommitteeMemberInput>({
    userId: '',
    name: '',
    email: '',
    role: 'member',
  });
  const [blockForm, setBlockForm] = useState<CreateCommitteeCalendarBlockInput>({
    title: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    blocksTempleCalendar: true,
  });
  const [taskForm, setTaskForm] = useState<CreateCommitteeTaskInput>({
    title: '',
    priority: 'medium',
    status: 'todo',
  });
  const [targetForm, setTargetForm] = useState<CreateCommitteeTargetInput>({
    title: '',
    period: 'quarterly',
    targetValue: 1,
    currentValue: 0,
  });
  const [messageForm, setMessageForm] = useState<CreateCommitteeMessageInput>({
    subject: '',
    body: '',
    isAnnouncement: true,
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const ep = createEndpoints(api);
      const [c, m, b, t, tg, r, ms] = await Promise.all([
        ep.getCommittee(id),
        ep.getCommitteeMembers(id),
        ep.getCommitteeCalendarBlocks(id),
        ep.getCommitteeTasks(id),
        ep.getCommitteeTargets(id),
        ep.getCommitteeRequests(id),
        ep.getCommitteeMessages(id),
      ]);
      setCommittee(c);
      setMembers(m.data);
      setBlocks(b.data);
      setTasks(t.data);
      setTargets(tg.data);
      setRequests(r.data);
      setMessages(ms.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load committee');
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(fn: () => Promise<void>) {
    setSaving(true);
    setMsg(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageIntro
        subtitle={committee?.purpose ?? 'Governance committee detail'}
        actions={
          <Link href="/admin/committees">
            <Button size="sm" variant="outline">
              ← All committees
            </Button>
          </Link>
        }
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className="flexRow mb2" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? 'primary' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {msg && <p className="hint mb1">{msg}</p>}

      {tab === 'overview' && committee && (
        <GlassCard title="Overview" compact>
          <p>{committee.description ?? 'No description.'}</p>
          <p className="hint mt1">
            {committee.memberCount ?? 0} members · {tasks.length} tasks · {requests.filter((r) => r.status === 'pending').length} pending requests
          </p>
        </GlassCard>
      )}

      {tab === 'members' && (
        <div className="grid2">
          <GlassCard title="Add member" compact>
            <div className="formStack">
              <label>
                User ID
                <input
                  value={memberForm.userId}
                  onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
                  placeholder="user-committee-001"
                />
              </label>
              <label>
                Name
                <input
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  value={memberForm.email ?? ''}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                />
              </label>
              <label>
                Role
                <select
                  value={memberForm.role}
                  onChange={(e) =>
                    setMemberForm({
                      ...memberForm,
                      role: e.target.value as CreateCommitteeMemberInput['role'],
                    })
                  }
                >
                  <option value="chair">Chair</option>
                  <option value="vice_chair">Vice chair</option>
                  <option value="secretary">Secretary</option>
                  <option value="member">Member</option>
                </select>
              </label>
              <Button
                size="sm"
                disabled={saving}
                onClick={() =>
                  void runAction(async () => {
                    const ep = createEndpoints(api);
                    await ep.addCommitteeMember(id, memberForm);
                    setMsg('Member added.');
                  })
                }
              >
                Add member
              </Button>
            </div>
          </GlassCard>
          <GlassCard title="Members" compact>
            <DataTable<CommitteeMember>
              getRowKey={(m) => m.id}
              columns={[
                { key: 'name', header: 'Name', render: (m) => m.name },
                { key: 'role', header: 'Role', render: (m) => m.role },
                { key: 'email', header: 'Email', render: (m) => m.email ?? '—' },
              ]}
              data={members}
            />
            {members.length === 0 && <p className="hint mt1">No members</p>}
          </GlassCard>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="grid2">
          <GlassCard title="Block dates" compact>
            <div className="formStack">
              <label>
                Title
                <input
                  value={blockForm.title}
                  onChange={(e) => setBlockForm({ ...blockForm, title: e.target.value })}
                />
              </label>
              <label>
                Start
                <input
                  type="date"
                  value={blockForm.startDate}
                  onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                />
              </label>
              <label>
                End
                <input
                  type="date"
                  value={blockForm.endDate}
                  onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                />
              </label>
              <Button
                size="sm"
                disabled={saving}
                onClick={() =>
                  void runAction(async () => {
                    await createEndpoints(api).createCommitteeCalendarBlock(id, blockForm);
                    setMsg('Calendar block created.');
                  })
                }
              >
                Add block
              </Button>
            </div>
          </GlassCard>
          <GlassCard title="Calendar blocks" compact>
            <DataTable<CommitteeCalendarBlock>
              getRowKey={(b) => b.id}
              columns={[
                { key: 'title', header: 'Title', render: (b) => b.title },
                {
                  key: 'dates',
                  header: 'Dates',
                  render: (b) =>
                    `${formatShortDate(b.startDate)} – ${formatShortDate(b.endDate)}`,
                },
              ]}
              data={blocks}
            />
            {blocks.length === 0 && <p className="hint mt1">No blocks</p>}
          </GlassCard>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="grid2">
          <GlassCard title="Assign task" compact>
            <div className="formStack">
              <label>
                Title
                <input
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                />
              </label>
              <label>
                Assignee user ID
                <input
                  value={taskForm.assigneeUserId ?? ''}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, assigneeUserId: e.target.value || undefined })
                  }
                />
              </label>
              <label>
                Priority
                <select
                  value={taskForm.priority ?? 'medium'}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      priority: e.target.value as CreateCommitteeTaskInput['priority'],
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <Button
                size="sm"
                disabled={saving}
                onClick={() =>
                  void runAction(async () => {
                    await createEndpoints(api).createCommitteeTask(id, taskForm);
                    setMsg('Task created.');
                  })
                }
              >
                Create task
              </Button>
            </div>
          </GlassCard>
          <GlassCard title="Tasks" compact>
            <DataTable<CommitteeTask>
              getRowKey={(t) => t.id}
              columns={[
                { key: 'title', header: 'Title', render: (t) => t.title },
                {
                  key: 'status',
                  header: 'Status',
                  render: (t) => (
                    <Badge variant={t.status === 'done' ? 'ok' : 'pending'}>{t.status}</Badge>
                  ),
                },
                {
                  key: 'assignee',
                  header: 'Assignee',
                  render: (t) => t.assigneeName ?? t.assigneeUserId ?? '—',
                },
              ]}
              data={tasks}
            />
            {tasks.length === 0 && <p className="hint mt1">No tasks</p>}
          </GlassCard>
        </div>
      )}

      {tab === 'targets' && (
        <div className="grid2">
          <GlassCard title="Add KPI target" compact>
            <div className="formStack">
              <label>
                Title
                <input
                  value={targetForm.title}
                  onChange={(e) => setTargetForm({ ...targetForm, title: e.target.value })}
                />
              </label>
              <label>
                Target value
                <input
                  type="number"
                  value={targetForm.targetValue}
                  onChange={(e) =>
                    setTargetForm({ ...targetForm, targetValue: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Period
                <select
                  value={targetForm.period}
                  onChange={(e) =>
                    setTargetForm({
                      ...targetForm,
                      period: e.target.value as CreateCommitteeTargetInput['period'],
                    })
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </label>
              <Button
                size="sm"
                disabled={saving}
                onClick={() =>
                  void runAction(async () => {
                    await createEndpoints(api).createCommitteeTarget(id, targetForm);
                    setMsg('Target created.');
                  })
                }
              >
                Add target
              </Button>
            </div>
          </GlassCard>
          <GlassCard title="KPI targets" compact>
            {targets.map((tg) => (
              <div key={tg.id} className="mb2">
                <div className="flexRow" style={{ justifyContent: 'space-between' }}>
                  <strong>{tg.title}</strong>
                  <span className="hint">
                    {tg.currentValue}/{tg.targetValue} {tg.unit ?? ''}
                  </span>
                </div>
                <ProgressBar
                  value={tg.targetValue > 0 ? (tg.currentValue / tg.targetValue) * 100 : 0}
                />
              </div>
            ))}
            {targets.length === 0 && <p className="hint">No targets yet</p>}
          </GlassCard>
        </div>
      )}

      {tab === 'requests' && (
        <GlassCard title="Requests" compact>
          <DataTable<CommitteeRequest>
            getRowKey={(r) => r.id}
            columns={[
              { key: 'title', header: 'Title', render: (r) => r.title },
              { key: 'type', header: 'Type', render: (r) => r.type },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <Badge
                    variant={
                      r.status === 'approved'
                        ? 'ok'
                        : r.status === 'rejected'
                          ? 'error'
                          : 'pending'
                    }
                  >
                    {r.status}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (r) =>
                  r.status === 'pending' ? (
                    <div className="flexRow" style={{ gap: '0.25rem' }}>
                      <Button
                        size="sm"
                        onClick={() =>
                          void runAction(async () => {
                            await createEndpoints(api).updateCommitteeRequest(id, r.id, {
                              status: 'approved',
                            });
                            setMsg('Request approved.');
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void runAction(async () => {
                            await createEndpoints(api).updateCommitteeRequest(id, r.id, {
                              status: 'rejected',
                            });
                            setMsg('Request rejected.');
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null,
              },
            ]}
            data={requests}
          />
          {requests.length === 0 && <p className="hint mt1">No requests</p>}
        </GlassCard>
      )}

      {tab === 'messages' && (
        <div className="grid2">
          <GlassCard title="Post message" compact>
            <div className="formStack">
              <label>
                Subject
                <input
                  value={messageForm.subject ?? ''}
                  onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                />
              </label>
              <label>
                Body
                <textarea
                  value={messageForm.body}
                  onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })}
                  rows={4}
                />
              </label>
              <Button
                size="sm"
                disabled={saving}
                onClick={() =>
                  void runAction(async () => {
                    await createEndpoints(api).createCommitteeMessage(id, messageForm);
                    setMessageForm({ subject: '', body: '', isAnnouncement: true });
                    setMsg('Message posted.');
                  })
                }
              >
                Post
              </Button>
            </div>
          </GlassCard>
          <GlassCard title="Messages" compact>
            {messages.map((m) => (
              <div key={m.id} className="mb2" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div className="flexRow" style={{ justifyContent: 'space-between' }}>
                  <strong>{m.subject ?? 'Message'}</strong>
                  {m.isAnnouncement && <Badge variant="info">Announcement</Badge>}
                </div>
                <p className="hint">{m.authorName} · {formatShortDate(m.createdAt)}</p>
                <p>{m.body}</p>
              </div>
            ))}
            {messages.length === 0 && <p className="hint">No messages yet</p>}
          </GlassCard>
        </div>
      )}
    </>
  );
}

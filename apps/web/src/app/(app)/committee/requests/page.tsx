'use client';

import { useState } from 'react';
import { Badge, Button, GlassCard } from '@tms/ui';
import { AppPage } from '@/components/AppPage';
import type { CommitteeRequestType, CreateCommitteeRequestInput } from '@tms/types';
import { createEndpoints, formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import { useCommitteeScope } from '@/lib/use-committee-scope';

const REQUEST_TYPES: CommitteeRequestType[] = [
  'calendar_block',
  'budget',
  'event',
  'leave',
  'task',
  'general',
];

export default function CommitteeRequestsPage() {
  const { api } = useTenant();
  const {
    committees,
    scopeParams,
    scopeSubtitle,
    committeeName,
    activeCommitteeId,
    isAllCommittees,
  } = useCommitteeScope();
  const defaultCommitteeId =
    !isAllCommittees && activeCommitteeId ? activeCommitteeId : (committees[0]?.id ?? '');
  const [committeeId, setCommitteeId] = useState('');
  const [form, setForm] = useState<CreateCommitteeRequestInput>({
    type: 'general',
    title: '',
    description: '',
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useApi(
    (ep) => ep.getMyCommitteeRequests(scopeParams),
    [scopeParams.committeeId],
  );
  const requests = data?.data ?? [];

  async function handleSubmit() {
    const cid = committeeId || defaultCommitteeId;
    if (!cid || !form.title.trim()) {
      setMsg('Select a committee and enter a title');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.createCommitteeRequest(cid, {
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
      });
      setForm({ type: 'general', title: '', description: '' });
      setMsg('Request submitted.');
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage subtitle={scopeSubtitle} loading={loading} error={error} showTenantContext={false}>
      <div className="grid2 mb2">
        <GlassCard title="Submit request" compact>
          <div className="formStack">
            <label>
              Committee
              <select
                value={committeeId || defaultCommitteeId}
                onChange={(e) => setCommitteeId(e.target.value)}
              >
                {committees.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as CommitteeRequestType })
                }
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </label>
            {(form.type === 'calendar_block' || form.type === 'leave') && (
              <>
                {form.type === 'calendar_block' && (
                  <label>
                    Block title
                    <input
                      value={form.blockTitle ?? ''}
                      onChange={(e) => setForm({ ...form, blockTitle: e.target.value })}
                    />
                  </label>
                )}
                <label>
                  {form.type === 'leave' ? 'Leave start' : 'Start date'}
                  <input
                    type="date"
                    value={form.blockStartDate ?? ''}
                    onChange={(e) => setForm({ ...form, blockStartDate: e.target.value })}
                  />
                </label>
                <label>
                  {form.type === 'leave' ? 'Leave end' : 'End date'}
                  <input
                    type="date"
                    value={form.blockEndDate ?? ''}
                    onChange={(e) => setForm({ ...form, blockEndDate: e.target.value })}
                  />
                </label>
              </>
            )}
            <Button size="sm" disabled={saving} onClick={() => void handleSubmit()}>
              Submit request
            </Button>
            {msg && <p className="hint">{msg}</p>}
          </div>
        </GlassCard>

        <GlassCard title="My requests" compact>
          {requests.length === 0 ? (
            <p className="hint">No requests submitted yet.</p>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="listRow">
                <div className="listRowMain">
                  <div className="listRowTitle">{r.title}</div>
                  <p className="hint">
                    {committeeName(r.committeeId)} · {r.type.replace('_', ' ')} ·{' '}
                    {formatShortDate(r.createdAt)}
                    {r.blockStartDate && r.blockEndDate && (
                      <>
                        {' '}
                        · {r.blockStartDate}
                        {r.blockStartDate !== r.blockEndDate && `–${r.blockEndDate}`}
                      </>
                    )}
                  </p>
                  {r.reviewNote && <p className="hint">Note: {r.reviewNote}</p>}
                </div>
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
              </div>
            ))
          )}
        </GlassCard>
      </div>
    </AppPage>
  );
}

'use client';

import { useState } from 'react';
import { Badge, Button, GlassCard } from '@tms/ui';
import { AppPage } from '@/components/AppPage';
import type {
  Committee,
  CommitteeRequestType,
  CreateCommitteeRequestInput,
} from '@tms/types';
import { createEndpoints, formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import { demoCommitteeDashboard } from '@/lib/demo-fallbacks';
import { useTenantSite } from '@/lib/tenant-site';

const REQUEST_TYPES: CommitteeRequestType[] = [
  'calendar_block',
  'budget',
  'event',
  'leave',
  'task',
  'general',
];

export default function CommitteeRequestsPage() {
  const site = useTenantSite();
  const { api } = useTenant();
  const [committeeId, setCommitteeId] = useState('');
  const [form, setForm] = useState<CreateCommitteeRequestInput>({
    type: 'general',
    title: '',
    description: '',
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: committeesData } = useApi((ep) => ep.getCommittees({ mine: true }));
  const { data, loading, error, refetch } = useApi((ep) => ep.getMyCommitteeRequests());
  const committees = committeesData?.data ?? [];
  const requests =
    data?.data ?? (error ? demoCommitteeDashboard(site.name).pendingApprovals : []);

  async function handleSubmit() {
    const cid = committeeId || committees[0]?.id;
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
    <AppPage
      subtitle="Submit and track committee requests"
      loading={loading}
      error={error}
      showTenantContext={false}
    >
      <div className="grid2 mb2">
        <GlassCard title="Submit request" compact>
          <div className="formStack">
            <label>
              Committee
              <select
                value={committeeId || committees[0]?.id || ''}
                onChange={(e) => setCommitteeId(e.target.value)}
              >
                {committees.map((c: Committee) => (
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
            {form.type === 'calendar_block' && (
              <>
                <label>
                  Block title
                  <input
                    value={form.blockTitle ?? ''}
                    onChange={(e) => setForm({ ...form, blockTitle: e.target.value })}
                  />
                </label>
                <label>
                  Start date
                  <input
                    type="date"
                    value={form.blockStartDate ?? ''}
                    onChange={(e) => setForm({ ...form, blockStartDate: e.target.value })}
                  />
                </label>
                <label>
                  End date
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
                    {r.type.replace('_', ' ')} · {formatShortDate(r.createdAt)}
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

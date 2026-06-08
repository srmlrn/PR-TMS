'use client';

import { useState } from 'react';
import { Badge, Button, GlassCard } from '@tms/ui';
import { AppPage } from '@/components/AppPage';
import type { Committee, CreateCommitteeMessageInput } from '@tms/types';
import { createEndpoints, formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';

export default function CommitteeMessagesPage() {
  const { api } = useTenant();
  const [committeeId, setCommitteeId] = useState('');
  const [form, setForm] = useState<CreateCommitteeMessageInput>({
    subject: '',
    body: '',
    isAnnouncement: false,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: committeesData, loading: committeesLoading } = useApi((ep) =>
    ep.getCommittees({ mine: true }),
  );
  const committees = committeesData?.data ?? [];
  const activeCommitteeId = committeeId || committees[0]?.id || '';

  const {
    data: messagesData,
    loading: messagesLoading,
    error,
    refetch,
  } = useApi(
    (ep) => ep.getCommitteeMessages(activeCommitteeId),
    [activeCommitteeId],
  );
  const messages = messagesData?.data ?? [];

  async function handlePost() {
    if (!activeCommitteeId || !form.body.trim()) {
      setMsg('Select a committee and enter a message');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.createCommitteeMessage(activeCommitteeId, {
        subject: form.subject?.trim() || undefined,
        body: form.body.trim(),
        isAnnouncement: form.isAnnouncement,
      });
      setForm({ subject: '', body: '', isAnnouncement: false });
      setMsg('Message posted.');
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Post failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      title="Committee Messages"
      subtitle="Group announcements and discussion"
      loading={committeesLoading || messagesLoading}
      error={error}
      showTenantContext={false}
    >
      <div className="grid2 mb2">
        <GlassCard title="Post message" compact>
          <div className="formStack">
            <label>
              Committee
              <select
                value={activeCommitteeId}
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
              Subject
              <input
                value={form.subject ?? ''}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </label>
            <label>
              Message
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={4}
              />
            </label>
            <label className="flexRow" style={{ gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={form.isAnnouncement ?? false}
                onChange={(e) => setForm({ ...form, isAnnouncement: e.target.checked })}
              />
              Announcement
            </label>
            <Button size="sm" disabled={saving} onClick={() => void handlePost()}>
              Post message
            </Button>
            {msg && <p className="hint">{msg}</p>}
          </div>
        </GlassCard>

        <GlassCard title="Messages" compact>
          {messages.length === 0 ? (
            <p className="hint">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="mb2"
                style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}
              >
                <div className="flexRow" style={{ justifyContent: 'space-between' }}>
                  <strong>{m.subject ?? 'Message'}</strong>
                  {m.isAnnouncement && <Badge variant="info">Announcement</Badge>}
                </div>
                <p className="hint">
                  {m.authorName ?? 'Member'} · {formatShortDate(m.createdAt)}
                </p>
                <p>{m.body}</p>
              </div>
            ))
          )}
        </GlassCard>
      </div>
    </AppPage>
  );
}

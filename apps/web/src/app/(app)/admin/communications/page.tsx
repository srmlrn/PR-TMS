'use client';

import { useEffect, useState } from 'react';
import { Button, GlassCard } from '@tms/ui';
import type { NotificationChannel, NotificationTemplate } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { createEndpoints } from '@/lib/api/endpoints';
import { DEMO_NOTIFICATION_TEMPLATES } from '@/lib/demo-fallbacks';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';

export default function AdminCommunicationsPage() {
  const { api } = useTenant();
  const [channel, setChannel] = useState<NotificationChannel>('email');
  const [templateId, setTemplateId] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: templates, loading, error: loadError } = useApi((ep) =>
    ep.getNotificationTemplates(),
  );

  const resolvedTemplates = loadError ? DEMO_NOTIFICATION_TEMPLATES : (templates ?? []);
  const channelTemplates = resolvedTemplates.filter((t) => t.channel === channel);

  useEffect(() => {
    if (channelTemplates.length > 0 && !templateId) {
      setTemplateId(channelTemplates[0].id);
    }
  }, [channelTemplates, templateId]);

  useEffect(() => {
    const tpl = resolvedTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject ?? '');
      setBody(tpl.body);
    }
  }, [templateId, resolvedTemplates]);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const tpl = resolvedTemplates.find((t) => t.id === id);
    if (tpl) {
      setChannel(tpl.channel);
      setSubject(tpl.subject ?? '');
      setBody(tpl.body);
    }
  }

  async function handleSend() {
    if (!to.trim()) {
      setError('Recipient (to) is required');
      return;
    }
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const ep = createEndpoints(api);
      const res = await ep.sendNotification({
        channel,
        to: to.trim(),
        templateId: templateId || undefined,
        subject: subject || undefined,
        body: body || undefined,
      });
      setResult(`Queued ${res.channel} to ${res.to} (id: ${res.id})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <AppPage
      subtitle="Send email or SMS using temple notification templates"
      loading={loading}
      error={loadError}
      showTenantContext={false}
    >
      <GlassCard title="Compose message">
        <div className="formGrid">
          <div className="formGroup">
            <label htmlFor="channel">Channel</label>
            <select
              id="channel"
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value as NotificationChannel);
                setTemplateId('');
              }}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div className="formGroup">
            <label htmlFor="template">Template</label>
            <select
              id="template"
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              {channelTemplates.map((t: NotificationTemplate) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="to">To</label>
            <input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={channel === 'email' ? 'devotee@example.com' : '+1 408-555-0101'}
            />
          </div>
          {channel === 'email' && (
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="subject">Subject</label>
              <input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}
          <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="body">Body</label>
            <textarea
              id="body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
          <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </div>
        {error && (
          <p className="tms-t2 mt1" style={{ color: 'var(--red)' }}>
            {error}
          </p>
        )}
        {result && <p className="tms-t2 mt1">{result}</p>}
      </GlassCard>
    </AppPage>
  );
}

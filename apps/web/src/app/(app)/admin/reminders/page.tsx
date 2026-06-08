'use client';

import { useState } from 'react';
import { Badge, Button, DataTable, GlassCard } from '@tms/ui';
import { PageStats } from '@/components/PageStats';
import type { DevoteeReminderDue } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { createEndpoints } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';

const DATE_TYPE_LABELS: Record<string, string> = {
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  star_day: 'Star day',
  other: 'Other',
};

export default function AdminRemindersPage() {
  const { api } = useTenant();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (ep) => ep.getRemindersDue(date),
    [date],
  );

  const reminders = data?.data ?? [];
  const queued = data?.notificationsQueued ?? 0;

  async function handleRunReminders() {
    setRunning(true);
    setRunMsg(null);
    try {
      const ep = createEndpoints(api);
      const result = await ep.getRemindersDue(date);
      setRunMsg(`Queued ${result.notificationsQueued} notification(s) for ${result.date}.`);
      await refetch();
    } catch (err) {
      setRunMsg(err instanceof Error ? err.message : 'Failed to run reminders');
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppPage
      subtitle="Devotees with birthdays, anniversaries, and star days"
      loading={loading}
      error={error}
      showTenantContext={false}
      actions={
        <Button size="sm" onClick={handleRunReminders} disabled={running}>
          {running ? 'Running…' : 'Run reminders'}
        </Button>
      }
    >

      <div className="flexRow mb2" style={{ gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="formGroup" style={{ marginBottom: 0 }}>
          <label htmlFor="reminder-date">Date</label>
          <input
            id="reminder-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <PageStats
        items={[
          { icon: '🔔', label: 'Notifications queued', value: queued, accent: 'amber' },
          { icon: '👥', label: 'Devotees due', value: reminders.length, accent: 'blue' },
        ]}
      />

      {runMsg && <p className="tms-t2 mb1">{runMsg}</p>}

      <GlassCard title={`Reminders for ${date}`} noBodyPadding>
        {reminders.length === 0 ? (
          <p className="tms-t2" style={{ padding: '1rem' }}>
            No important dates on this day.
          </p>
        ) : (
          <DataTable<DevoteeReminderDue>
            getRowKey={(r) => `${r.devoteeId}-${r.importantDate.label}`}
            columns={[
              { key: 'name', header: 'Devotee', render: (r) => r.devoteeName },
              { key: 'phone', header: 'Phone', render: (r) => r.phone },
              {
                key: 'type',
                header: 'Type',
                render: (r) => (
                  <Badge variant="info">
                    {DATE_TYPE_LABELS[r.importantDate.type] ?? r.importantDate.type}
                  </Badge>
                ),
              },
              { key: 'label', header: 'Label', render: (r) => r.importantDate.label },
              { key: 'date', header: 'Date', render: (r) => r.importantDate.date.slice(0, 10) },
            ]}
            data={reminders}
          />
        )}
      </GlassCard>
    </AppPage>
  );
}

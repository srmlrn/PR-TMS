'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, GlassCard, PageHeader } from '@tms/ui';
import {
  type TenantScheduleSettings,
  type UpdateTenantScheduleInput,
} from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import styles from '../settings.module.css';

const INTERVAL_OPTIONS = [15, 30, 45, 60];

export default function ScheduleSettingsPage() {
  const { api } = useTenant();
  const [settings, setSettings] = useState<TenantScheduleSettings | null>(null);
  const [openHour, setOpenHour] = useState(9);
  const [closeHour, setCloseHour] = useState(17);
  const [slotInterval, setSlotInterval] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<TenantScheduleSettings>('/settings/schedules');
      setSettings(data);
      setOpenHour(data.openHour);
      setCloseHour(data.closeHour);
      setSlotInterval(data.slotIntervalMinutes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body: UpdateTenantScheduleInput = {
        openHour,
        closeHour,
        slotIntervalMinutes: slotInterval,
      };
      const data = await api.patch<TenantScheduleSettings>('/settings/schedules', body);
      setSettings(data);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save schedules');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Schedules & Hours"
        subtitle="Temple open hours and default seva booking slot interval"
        actions={
          <Link href="/admin/settings">
            <Button variant="glass">← Settings</Button>
          </Link>
        }
      />

      {error && (
        <GlassCard className={styles.errorCard}>
          <p>{error}</p>
        </GlassCard>
      )}
      {saved && (
        <GlassCard className={styles.successCard}>
          <p>Schedule saved — booking slot picker uses these hours immediately.</p>
        </GlassCard>
      )}

      <GlassCard title="Temple Hours" className={styles.configCard}>
        {loading && <p className={styles.muted}>Loading…</p>}
        {!loading && (
          <>
            <div className={styles.configGrid}>
              <label>
                Opens at (hour, 0–23)
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={openHour}
                  onChange={(e) => setOpenHour(Number(e.target.value))}
                />
              </label>
              <label>
                Closes at (hour, 1–24)
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={closeHour}
                  onChange={(e) => setCloseHour(Number(e.target.value))}
                />
              </label>
              <label>
                Slot interval (minutes)
                <select
                  value={slotInterval}
                  onChange={(e) => setSlotInterval(Number(e.target.value))}
                >
                  {INTERVAL_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className={styles.hint}>
              Slots run from {openHour}:00 to {closeHour}:00 every {slotInterval} minutes. Per-seva
              duration still applies when checking availability.
              {settings?.updatedAt && (
                <>
                  {' '}
                  Last updated {new Date(settings.updatedAt).toLocaleString()}.
                </>
              )}
            </p>
            <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Schedule'}
            </Button>
          </>
        )}
      </GlassCard>
    </div>
  );
}

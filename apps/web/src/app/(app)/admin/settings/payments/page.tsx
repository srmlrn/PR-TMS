'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  GlassCard,
} from '@tms/ui';
import { PageIntro } from '@/components/AppPage';
import {
  SECRET_FIELD_MASK,
  type TenantPaymentSettingsPublic,
  type UpdateTenantPaymentSettingsInput,
} from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import styles from '../settings.module.css';

function sourceLabel(source: TenantPaymentSettingsPublic['source']): string {
  if (source === 'tenant') return 'Tenant keys';
  if (source === 'env') return 'Platform env fallback';
  return 'Not configured';
}

export default function PaymentSettingsPage() {
  const { api } = useTenant();
  const [settings, setSettings] = useState<TenantPaymentSettingsPublic | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<TenantPaymentSettingsPublic>('/settings/payments');
      setSettings(data);
      setEnabled(data.stripe.enabled);
      setMode(data.stripe.mode);
      setPublishableKey(data.stripe.publishableKey ?? '');
      setSecretKey(data.stripe.hasSecretKey ? SECRET_FIELD_MASK : '');
      setWebhookSecret(data.stripe.hasWebhookSecret ? SECRET_FIELD_MASK : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment settings');
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
      const body: UpdateTenantPaymentSettingsInput = {
        stripe: {
          enabled,
          mode,
          publishableKey,
          secretKey: secretKey.trim() || undefined,
          webhookSecret: webhookSecret.trim() || undefined,
        },
      };
      const data = await api.patch<TenantPaymentSettingsPublic>('/settings/payments', body);
      setSettings(data);
      setSecretKey(data.stripe.hasSecretKey ? SECRET_FIELD_MASK : '');
      setWebhookSecret(data.stripe.hasWebhookSecret ? SECRET_FIELD_MASK : '');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageIntro
        subtitle="Configure Stripe keys for this temple — each tenant manages its own payment provider"
        actions={
          <Link href="/admin/settings">
            <Button variant="glass">← Back to Settings</Button>
          </Link>
        }
        showTenantContext={false}
      />

      {error && (
        <GlassCard className={styles.errorCard}>
          <p>{error}</p>
        </GlassCard>
      )}

      {saved && (
        <GlassCard className={styles.successCard}>
          <p>Payment settings saved.</p>
        </GlassCard>
      )}

      <GlassCard title="Stripe Configuration" className={styles.configCard}>
        {loading && <p className={styles.muted}>Loading…</p>}
        {!loading && settings && (
          <>
            <div className={styles.settingsMeta}>
              <span>
                Key source: <strong>{sourceLabel(settings.source)}</strong>
              </span>
              <Badge variant={settings.stripe.enabled ? 'ok' : 'pending'}>
                {settings.stripe.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Badge variant={settings.stripe.mode === 'live' ? 'ok' : 'info'}>
                {settings.stripe.mode === 'live' ? 'Live mode' : 'Test mode'}
              </Badge>
            </div>

            <div className={styles.configGrid}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Enable Stripe payments
              </label>

              <label>
                Mode
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'test' | 'live')}
                >
                  <option value="test">Test</option>
                  <option value="live">Live</option>
                </select>
              </label>

              <label>
                Publishable key
                <input
                  type="text"
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  placeholder="pk_test_… or pk_live_…"
                  autoComplete="off"
                />
              </label>

              <label>
                Secret key
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder={settings.stripe.hasSecretKey ? SECRET_FIELD_MASK : 'sk_test_…'}
                  autoComplete="new-password"
                />
              </label>

              <label className={styles.fullWidth}>
                Webhook secret
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={
                    settings.stripe.hasWebhookSecret ? SECRET_FIELD_MASK : 'whsec_…'
                  }
                  autoComplete="new-password"
                />
              </label>
            </div>

            <p className={styles.hint}>
              Secret keys are never returned from the API. Leave masked fields unchanged to keep
              existing values. Platform environment variables are used only when no tenant secret
              key is configured.
            </p>

            <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Stripe Settings'}
            </Button>
          </>
        )}
      </GlassCard>
    </div>
  );
}

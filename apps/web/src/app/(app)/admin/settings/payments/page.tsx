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
import { useTenantSite } from '@/lib/tenant-site';
import styles from '../settings.module.css';

function sourceLabel(source: TenantPaymentSettingsPublic['source']): string {
  if (source === 'tenant') return 'Tenant keys';
  if (source === 'env') return 'Platform env fallback';
  return 'Not configured';
}

export default function PaymentSettingsPage() {
  const { api, tenantId } = useTenant();
  const site = useTenantSite();
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
        subtitle={`Stripe keys for ${site.name} only — other temples keep their own separate payment settings`}
        actions={
          <Link href="/admin/settings">
            <Button variant="glass">← Back to Settings</Button>
          </Link>
        }
        showTenantContext
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
                Temple: <strong>{site.name}</strong>
              </span>
              <span>
                Tenant ID: <code>{tenantId}</code>
              </span>
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
                  autoComplete="off"
                />
              </label>

              <label>
                Secret key
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  {...(settings.stripe.hasSecretKey ? { placeholder: SECRET_FIELD_MASK } : {})}
                  autoComplete="new-password"
                />
              </label>

              <label className={styles.fullWidth}>
                Webhook secret
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  {...(settings.stripe.hasWebhookSecret ? { placeholder: SECRET_FIELD_MASK } : {})}
                  autoComplete="new-password"
                />
              </label>
            </div>

            <p className={styles.hint}>
              Secret keys are never returned from the API. Leave masked fields unchanged to keep
              existing values. Each temple stores its own keys — switching temples in the header
              loads a different configuration. Sri Venkateswara Temple and Sri Ganesha Temple do
              not share Stripe accounts.
            </p>

            <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Stripe Settings'}
            </Button>
          </>
        )}
      </GlassCard>

      {!loading && settings && (
        <GlassCard title="Wallets, QR & test checklist" className={styles.configCard}>
          <p className={styles.hint}>
            Apple Pay, Google Pay, and QR/UPI use the providers below. Status reflects server env +
            saved tenant Stripe keys.
          </p>

          <ul className={styles.checklist}>
            <li>
              <Badge variant={settings.testCapabilities.stripeLive ? 'ok' : 'pending'}>
                {settings.testCapabilities.stripeLive ? 'Ready' : 'Setup needed'}
              </Badge>
              <strong>Stripe (card)</strong> — enable above with test keys{' '}
              <code>pk_test_…</code> / <code>sk_test_…</code>
            </li>
            <li>
              <Badge variant={settings.testCapabilities.stripeWebhookConfigured ? 'ok' : 'pending'}>
                {settings.testCapabilities.stripeWebhookConfigured ? 'Ready' : 'Setup needed'}
              </Badge>
              <strong>Stripe webhook</strong> → <code>POST /api/v1/payments/webhooks/stripe</code>
            </li>
            <li>
              <Badge variant={settings.testCapabilities.applePayDomainConfigured ? 'ok' : 'info'}>
                {settings.testCapabilities.applePayDomainConfigured ? 'Configured' : 'Prod only'}
              </Badge>
              <strong>Apple Pay</strong> — register domain in Stripe Dashboard; set{' '}
              <code>APPLE_PAY_DOMAIN_ASSOCIATION</code> on web deploy (HTTPS)
            </li>
            <li>
              <Badge variant={settings.testCapabilities.stripeLive ? 'ok' : 'info'}>Via Stripe</Badge>
              <strong>Google Pay</strong> — appears in Stripe checkout on Chrome/Android with test keys
            </li>
            <li>
              <Badge variant={settings.testCapabilities.razorpayLive ? 'ok' : 'pending'}>
                {settings.testCapabilities.razorpayLive ? 'Ready' : 'Demo QR'}
              </Badge>
              <strong>QR / UPI</strong> — live Razorpay UPI QR when API env has{' '}
              <code>RAZORPAY_KEY_*</code>; demo uses VPA{' '}
              <code>{settings.testCapabilities.demoUpiVpa}</code>
            </li>
            <li>
              <Badge variant={settings.testCapabilities.razorpayWebhookConfigured ? 'ok' : 'pending'}>
                {settings.testCapabilities.razorpayWebhookConfigured ? 'Ready' : 'Setup needed'}
              </Badge>
              <strong>Razorpay webhook</strong> → <code>POST /api/v1/payments/webhooks/razorpay</code>{' '}
              (enable <code>qr_code.credited</code> + <code>payment.captured</code>)
            </li>
          </ul>

          <p className={styles.hint}>
            <strong>How to test locally</strong>
          </p>
          <ol className={styles.stepsList}>
            <li>
              Book or donate → choose <strong>Card · Apple Pay · Google Pay</strong> (Stripe) or{' '}
              <strong>QR / UPI scan</strong>.
            </li>
            <li>
              Front desk counter → choose <strong>Apple Pay</strong> or <strong>Google Pay</strong>{' '}
              → Submit shows a QR — customer scans with their phone (IONOS-style scan-to-pay).
            </li>
            <li>
              Demo mode (no keys): QR shows a scannable code — click <em>Simulate scan &amp; pay</em>{' '}
              or open{' '}
              <code>{settings.testCapabilities.webPayOrigin}/pay?sessionId=…&amp;tenantId=…</code>
            </li>
            <li>
              Stripe test: use card <code>4242 4242 4242 4242</code>; wallets appear on supported
              browsers when live Stripe is enabled.
            </li>
            <li>
              Razorpay test: set API + web env keys; INR + QR provider creates a live UPI QR image.
            </li>
          </ol>
        </GlassCard>
      )}
    </div>
  );
}

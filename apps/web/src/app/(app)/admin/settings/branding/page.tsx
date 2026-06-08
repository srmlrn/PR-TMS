'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, GlassCard } from '@tms/ui';
import {
  type TenantBrandingSettingsPublic,
  type UpdateTenantBrandingInput,
} from '@tms/types';
import { PageIntro } from '@/components/AppPage';
import { useTenant } from '@/lib/tenant-context';
import styles from '../settings.module.css';

export default function BrandingSettingsPage() {
  const { api } = useTenant();
  const [settings, setSettings] = useState<TenantBrandingSettingsPublic | null>(null);
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [icon, setIcon] = useState('');
  const [logoSrc, setLogoSrc] = useState('');
  const [logoBg, setLogoBg] = useState('');
  const [deity, setDeity] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [tickerText, setTickerText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<TenantBrandingSettingsPublic>('/settings/branding');
      setSettings(data);
      setName(data.overrides.name ?? data.branding.name);
      setSubtitle(data.overrides.subtitle ?? data.branding.subtitle);
      setIcon(data.overrides.icon ?? data.branding.icon);
      setLogoSrc(data.overrides.logoSrc ?? data.branding.logoSrc ?? '');
      setLogoBg(data.overrides.logoBg ?? data.branding.logoBg ?? '');
      setDeity(data.overrides.deity ?? data.branding.deity);
      setLocation(data.overrides.location ?? data.branding.location);
      setAddress(data.overrides.address ?? data.branding.address ?? '');
      setTickerText(
        (data.overrides.displayAnnouncements ?? data.branding.displayAnnouncements ?? []).join(
          '\n',
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load branding');
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
      const body: UpdateTenantBrandingInput = {
        name,
        subtitle,
        icon,
        logoSrc,
        logoBg,
        deity,
        location,
        address,
        displayAnnouncements: tickerText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      };
      const data = await api.patch<TenantBrandingSettingsPublic>('/settings/branding', body);
      setSettings(data);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  }

  const preview = settings?.branding;

  return (
    <div>
      <PageIntro
        subtitle="Temple name, logo, deity label, address, and display-board ticker messages"
        actions={
          <Link href="/admin/settings">
            <Button variant="glass">← Settings</Button>
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
          <p>Branding saved — live across devotee, kiosk, and display board pages.</p>
        </GlassCard>
      )}

      <GlassCard title="Live Preview" className={styles.configCard}>
        {preview && (
          <div
            className={styles.previewBar}
            style={preview.logoBg ? { background: preview.logoBg } : undefined}
          >
            {preview.logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.logoSrc} alt="" className={styles.previewLogo} />
            ) : (
              <span className={styles.previewIcon}>{icon || preview.icon}</span>
            )}
            <div>
              <strong>{name || preview.name}</strong>
              <div className={styles.muted}>{subtitle || preview.subtitle}</div>
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard title="Site Identity" className={styles.configCard}>
        {loading && <p className={styles.muted}>Loading…</p>}
        {!loading && (
          <>
            <div className={styles.configGrid}>
              <label>
                Temple name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Subtitle / tagline
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </label>
              <label>
                Icon (emoji fallback)
                <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} />
              </label>
              <label>
                Logo path
                <input
                  value={logoSrc}
                  onChange={(e) => setLogoSrc(e.target.value)}
                  placeholder="/tenants/your-logo.png"
                />
              </label>
              <label>
                Logo bar background
                <input
                  value={logoBg}
                  onChange={(e) => setLogoBg(e.target.value)}
                  placeholder="#960000"
                />
              </label>
              <label>
                Primary deity label
                <input value={deity} onChange={(e) => setDeity(e.target.value)} />
              </label>
              <label>
                Location (region)
                <input value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
              <label className={styles.fullWidth}>
                Street address (receipts & headers)
                <input value={address} onChange={(e) => setAddress(e.target.value)} />
              </label>
              <label className={styles.fullWidth}>
                Display ticker messages (one per line)
                <textarea
                  value={tickerText}
                  onChange={(e) => setTickerText(e.target.value)}
                  rows={4}
                  style={{
                    padding: '0.55rem 0.75rem',
                    background: 'var(--ink3)',
                    border: '1px solid var(--b)',
                    borderRadius: 'var(--rs)',
                    color: 'var(--txt)',
                    fontFamily: 'inherit',
                  }}
                />
              </label>
            </div>
            <p className={styles.hint}>
              Upload logo images to <code>apps/web/public/tenants/</code> then reference the path
              above. Empty fields keep platform defaults for this demo tenant.
            </p>
            <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Branding'}
            </Button>
          </>
        )}
      </GlassCard>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  EnvBadge,
  GlassCard,
  PageHeader,
  ProgressBar,
  StatTile,
} from '@tms/ui';
import {
  TenantEnvironment,
  type EnvironmentUsageSummary,
  type TenantEnvironmentRecord,
} from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { useTenantSite } from '@/lib/tenant-site';
import styles from './settings.module.css';

const ENV_ORDER: TenantEnvironment[] = [
  TenantEnvironment.PROD,
  TenantEnvironment.UAT,
  TenantEnvironment.TEST,
  TenantEnvironment.DEV,
];

function envBadgeVariant(env: TenantEnvironment): 'prod' | 'uat' | 'dev' {
  if (env === TenantEnvironment.PROD) return 'prod';
  if (env === TenantEnvironment.UAT) return 'uat';
  return 'dev';
}

function statusTag(status: TenantEnvironmentRecord['status']) {
  if (status === 'active') return <Badge variant="ok">Active</Badge>;
  if (status === 'provisioning') return <Badge variant="pending">Provisioning</Badge>;
  if (status === 'suspended') return <Badge variant="error">Suspended</Badge>;
  return <Badge variant="info">{status}</Badge>;
}

export default function SettingsPage() {
  const { tenantId, environment, setEnvironment, api } = useTenant();
  const site = useTenantSite();
  const dbSlug = site.slug.replace(/-/g, '_');
  const [envs, setEnvs] = useState<TenantEnvironmentRecord[]>([]);
  const [usage, setUsage] = useState<EnvironmentUsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [envList, usageList] = await Promise.all([
          api.get<TenantEnvironmentRecord[]>(`/platform/tenants/${tenantId}/environments`),
          api.get<EnvironmentUsageSummary[]>(`/platform/tenants/${tenantId}/usage`),
        ]);
        if (!cancelled) {
          setEnvs(envList);
          setUsage(usageList);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load environments');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [api, tenantId, environment]);

  const totalCost = usage.reduce((sum, u) => sum + u.estimatedCostUsd, 0);

  return (
    <div>
      <PageHeader
        title="Settings & Environments"
        subtitle="Each environment has its own isolated database — dev, test, UAT, and prod"
        actions={<Button variant="primary">+ Create Environment</Button>}
      />

      {error && (
        <GlassCard className={styles.errorCard}>
          <p>{error}</p>
          <p className={styles.hint}>
            Start API with PostgreSQL: <code>docker compose up -d && npm run dev:api</code>
          </p>
        </GlassCard>
      )}

      <div className={styles.stats}>
        <StatTile
          icon="🏛️"
          label="Environments"
          value={String(envs.length || 4)}
          change={`Active: ${envs.filter((e) => e.status === 'active').length}`}
          changeTone="neutral"
          accent="amber"
        />
        <StatTile
          icon="🗄️"
          label="Isolated DBs"
          value={String(envs.length || 4)}
          change="One DB per env"
          changeTone="up"
          accent="green"
        />
        <StatTile
          icon="💰"
          label="Est. Cost MTD"
          value={`$${totalCost.toFixed(0)}`}
          change="Metered per env"
          changeTone="neutral"
          accent="blue"
        />
        <StatTile
          icon="🌐"
          label="Current Env"
          value={environment.toUpperCase()}
          change="Switch below"
          changeTone="neutral"
          accent="red"
        />
      </div>

      <div className={styles.grid}>
        <GlassCard title="Environments" className={styles.envList}>
          {loading && <p className={styles.muted}>Loading environments…</p>}
          {!loading &&
            ENV_ORDER.map((envType) => {
              const record = envs.find((e) => e.env === envType);
              const isActive = environment === envType;
              return (
                <div
                  key={envType}
                  className={`${styles.envRow} ${isActive ? styles.envRowActive : ''}`}
                >
                  <div className={styles.envLeft}>
                    <span className={`${styles.envDot} ${styles[`dot_${envType}`]}`} />
                    <div>
                      <strong>{envType.toUpperCase()}</strong>
                      <div className={styles.dbName}>
                        {record?.dbName ?? `tms_${dbSlug}_${envType}`}
                      </div>
                      {record?.subdomain && (
                        <div className={styles.subdomain}>{record.subdomain}.templesaas.com</div>
                      )}
                    </div>
                  </div>
                  <div className={styles.envRight}>
                    {record && statusTag(record.status)}
                    <EnvBadge variant={envBadgeVariant(envType)}>
                      {envType === TenantEnvironment.PROD ? 'LIVE' : envType.toUpperCase()}
                    </EnvBadge>
                    <Button
                      variant={isActive ? 'primary' : 'glass'}
                      size="sm"
                      onClick={() => setEnvironment(envType)}
                    >
                      {isActive ? 'Active' : 'Switch'}
                    </Button>
                    {envType === TenantEnvironment.UAT && (
                      <Button variant="outline" size="sm">
                        Promote → Prod
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
        </GlassCard>

        <GlassCard title="Metered Usage (MTD)" className={styles.usageCard}>
          {usage.length === 0 && !loading && (
            <p className={styles.muted}>No usage data yet — defaults shown when API is in memory mode.</p>
          )}
          {usage.map((u) => (
            <div key={u.environmentId} className={styles.usageBlock}>
              <div className={styles.usageHead}>
                <strong>{u.env.toUpperCase()}</strong>
                <span>${u.estimatedCostUsd}/mo est.</span>
              </div>
              <div className={styles.metricRow}>
                <span>API calls</span>
                <span>{u.metrics.apiCalls.toLocaleString()}</span>
              </div>
              <ProgressBar
                value={Math.min(100, (u.metrics.apiCalls / 20000) * 100)}
                color="amber"
              />
              <div className={styles.metricRow}>
                <span>Transactions</span>
                <span>{u.metrics.transactions}</span>
              </div>
              <ProgressBar
                value={Math.min(100, (u.metrics.transactions / 2000) * 100)}
                color="green"
              />
              <div className={styles.metricRow}>
                <span>Storage</span>
                <span>{u.metrics.storageGb} GB</span>
              </div>
              <ProgressBar
                value={Math.min(100, (u.metrics.storageGb / 10) * 100)}
                color="blue"
              />
            </div>
          ))}
        </GlassCard>
      </div>

      <GlassCard title="Site & Operations" className={styles.configCard}>
        <p className={styles.muted}>
          Branding, seva catalog, counter products, and temple hours — each tenant manages its own site.
        </p>
        <div className={styles.linkGrid}>
          <Link href="/admin/settings/branding">
            <Button variant="glass">Branding & Labels</Button>
          </Link>
          <Link href="/admin/settings/catalog/services">
            <Button variant="glass">Seva Catalog</Button>
          </Link>
          <Link href="/admin/settings/catalog/products">
            <Button variant="glass">Counter Products</Button>
          </Link>
          <Link href="/admin/settings/schedules">
            <Button variant="glass">Schedules & Hours</Button>
          </Link>
        </div>
      </GlassCard>

      <GlassCard title="Tenant Configuration" className={styles.configCard}>
        <p className={styles.muted}>
          Manage Stripe and other payment provider keys per tenant.
        </p>
        <Link href="/admin/settings/payments">
          <Button variant="primary">Payment Settings →</Button>
        </Link>
      </GlassCard>

      <GlassCard title="General Configuration" className={styles.configCard}>
        <div className={styles.configGrid}>
          <label>
            Base Currency
            <select defaultValue="USD">
              <option>USD</option>
              <option>INR</option>
              <option>CAD</option>
            </select>
          </label>
          <label>
            Tax Compliance
            <select defaultValue="usa">
              <option value="usa">USA — 501(c)(3)</option>
              <option value="india">India — 80G</option>
              <option value="canada">Canada — CRA</option>
            </select>
          </label>
          <label>
            Region
            <select defaultValue="us-west1">
              <option>us-west1 (California)</option>
              <option>asia-south1 (Mumbai)</option>
              <option>northamerica-northeast1 (Montreal)</option>
            </select>
          </label>
          <label>
            Isolation Tier
            <select defaultValue="standard">
              <option>shared_pool</option>
              <option>standard</option>
              <option>dedicated</option>
            </select>
          </label>
        </div>
        <Button variant="primary">Save Config</Button>
      </GlassCard>
    </div>
  );
}

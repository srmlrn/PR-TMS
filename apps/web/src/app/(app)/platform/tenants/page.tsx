'use client';

import { Badge, DataTable, GlassCard, StatTile } from '@tms/ui';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './tenants.module.css';

export default function PlatformTenantsPage() {
  const { tenantId } = useTenant();
  const { data: tenants, loading: tLoading, error: tError } = useApi((ep) =>
    ep.listTenants(),
  );
  const { data: envs, loading: eLoading, error: eError } = useApi(
    (ep) => ep.getTenantEnvironments(tenantId),
    [tenantId],
  );
  const { data: usage, loading: uLoading, error: uError } = useApi(
    (ep) => ep.getTenantUsage(tenantId),
    [tenantId],
  );

  const loading = tLoading || eLoading || uLoading;
  const error = tError ?? eError ?? uError;

  const tenantRows = (tenants ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    country: t.country,
    active: t.isActive ? 'yes' : 'no',
  }));

  const envRows = (envs ?? []).map((e) => ({
    id: e.id,
    env: e.env.toUpperCase(),
    status: e.status,
    db: e.dbName,
    tier: e.isolationTier,
  }));

  const totalCost = (usage ?? []).reduce((sum, u) => sum + u.estimatedCostUsd, 0);

  return (
    <>
      <PageIntro
        subtitle="Multi-tenant control plane · environments · metered usage"
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.stats}>
        <StatTile label="Tenants" value={String(tenantRows.length || 1)} icon="🏛️" />
        <StatTile label="Environments" value={String(envRows.length || 4)} icon="🌐" />
        <StatTile label="Est. Monthly" value={`$${totalCost.toFixed(0) || '248'}`} icon="💳" />
      </div>

      <div className={styles.grid}>
        <GlassCard title="All Tenants" noBodyPadding>
          <DataTable
            getRowKey={(row) => row.id}
            columns={[
              { key: 'name', header: 'Temple', render: (r) => r.name },
              { key: 'slug', header: 'Slug', render: (r) => r.slug },
              { key: 'plan', header: 'Plan', render: (r) => r.plan },
              { key: 'country', header: 'Country', render: (r) => r.country },
              {
                key: 'active',
                header: 'Active',
                render: (r) => (
                  <Badge variant={r.active === 'yes' ? 'ok' : 'error'}>{r.active}</Badge>
                ),
              },
            ]}
            data={
              tenantRows.length
                ? tenantRows
                : [
                    {
                      id: tenantId,
                      name: 'Sri Venkateswara Temple',
                      slug: 'sv-temple',
                      plan: 'standard',
                      country: 'USA',
                      active: 'yes',
                    },
                  ]
            }
          />
        </GlassCard>

        <GlassCard title="Environments (demo tenant)" noBodyPadding>
          <DataTable
            getRowKey={(row) => row.id}
            columns={[
              { key: 'env', header: 'Env', render: (r) => r.env },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <Badge variant={r.status === 'active' ? 'ok' : 'pending'}>{r.status}</Badge>
                ),
              },
              { key: 'db', header: 'Database', render: (r) => r.db },
              { key: 'tier', header: 'Tier', render: (r) => r.tier },
            ]}
            data={
              envRows.length
                ? envRows
                : [
                    { id: '1', env: 'PROD', status: 'active', db: 'tms_sv_temple_prod', tier: 'shared_pool' },
                    { id: '2', env: 'UAT', status: 'active', db: 'tms_sv_temple_uat', tier: 'shared_pool' },
                  ]
            }
          />
        </GlassCard>
      </div>
    </>
  );
}

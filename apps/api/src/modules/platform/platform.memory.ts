import {
  DEMO_TENANT_IDS,
  EnvironmentUsageSummary,
  getTenantBranding,
  Tenant,
  TenantEnvironment,
  TenantEnvironmentRecord,
} from '@tms/types';

const now = new Date();

export const MEMORY_TENANTS: Tenant[] = DEMO_TENANT_IDS.map((id) => {
  const brand = getTenantBranding(id);
  return {
    id,
    slug: brand.slug,
    name: brand.name,
    country: brand.country,
    baseCurrency: brand.baseCurrency,
    plan: 'pro',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
});

/** @deprecated Use MEMORY_TENANTS[0] */
export const MEMORY_TENANT = MEMORY_TENANTS[0];

export const MEMORY_ENVIRONMENTS: TenantEnvironmentRecord[] = DEMO_TENANT_IDS.flatMap(
  (tenantId) => {
    const slug = getTenantBranding(tenantId).slug.replace(/-/g, '_');
    return [TenantEnvironment.PROD, TenantEnvironment.UAT, TenantEnvironment.TEST, TenantEnvironment.DEV].map(
      (env) => ({
        id: `mem-env-${tenantId}-${env}`,
        tenantId,
        env,
        status: 'active' as const,
        dbName: `tms_${slug}_${env}`,
        dbHost: 'localhost',
        dbPort: 5432,
        isolationTier:
          env === TenantEnvironment.PROD ? ('standard' as const) : ('shared_pool' as const),
        region: tenantId === '00000000-0000-0000-0000-000000000002' ? 'us-central1' : 'us-west1',
        subdomain: `${getTenantBranding(tenantId).slug}.${env}`,
        featureFlags: {},
        resourceTier: { cpu: '500m', memory: '512Mi', storageGb: 5 },
        provisionedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    );
  },
);

export function getMemoryTenant(tenantId: string): Tenant | undefined {
  return MEMORY_TENANTS.find((t) => t.id === tenantId);
}

export function getMemoryUsage(tenantId?: string): EnvironmentUsageSummary[] {
  const envs = tenantId
    ? MEMORY_ENVIRONMENTS.filter((e) => e.tenantId === tenantId)
    : MEMORY_ENVIRONMENTS;
  return envs.map((e, i) => ({
    environmentId: e.id,
    env: e.env,
    metrics: {
      apiCalls: 12500 - (i % 4) * 2000,
      storageGb: 2.4 + (i % 4) * 0.5,
      transactions: 840 - (i % 4) * 100,
      messages: 320,
      computeHours: 48 - (i % 4) * 8,
    },
    estimatedCostUsd: e.env === TenantEnvironment.PROD ? 248 : 49,
  }));
}

import {
  EnvironmentUsageSummary,
  Tenant,
  TenantEnvironment,
  TenantEnvironmentRecord,
} from '@tms/types';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const now = new Date();

export const MEMORY_TENANT: Tenant = {
  id: DEMO_TENANT_ID,
  slug: 'sv-temple',
  name: 'Sri Venkateswara Temple',
  country: 'US',
  baseCurrency: 'USD',
  plan: 'pro',
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

export const MEMORY_ENVIRONMENTS: TenantEnvironmentRecord[] = [
  TenantEnvironment.PROD,
  TenantEnvironment.UAT,
  TenantEnvironment.TEST,
  TenantEnvironment.DEV,
].map((env) => ({
  id: `mem-env-${env}`,
  tenantId: DEMO_TENANT_ID,
  env,
  status: 'active' as const,
  dbName: `tms_sv_temple_${env}`,
  dbHost: 'localhost',
  dbPort: 5432,
  isolationTier:
    env === TenantEnvironment.PROD ? ('standard' as const) : ('shared_pool' as const),
  region: 'us-west1',
  subdomain: `sv-temple.${env}`,
  featureFlags: {},
  resourceTier: { cpu: '500m', memory: '512Mi', storageGb: 5 },
  provisionedAt: now,
  createdAt: now,
  updatedAt: now,
}));

export function getMemoryUsage(): EnvironmentUsageSummary[] {
  return MEMORY_ENVIRONMENTS.map((e, i) => ({
    environmentId: e.id,
    env: e.env,
    metrics: {
      apiCalls: 12500 - i * 2000,
      storageGb: 2.4 + i * 0.5,
      transactions: 840 - i * 100,
      messages: 320,
      computeHours: 48 - i * 8,
    },
    estimatedCostUsd: e.env === TenantEnvironment.PROD ? 248 : 49,
  }));
}

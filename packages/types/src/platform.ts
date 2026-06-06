import { TenantEnvironment } from './enums';

export type EnvironmentStatus =
  | 'pending'
  | 'provisioning'
  | 'active'
  | 'suspended'
  | 'decommissioned';

export type TenantPlan = 'starter' | 'standard' | 'pro' | 'enterprise';
export type IsolationTier = 'shared_pool' | 'standard' | 'dedicated';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  country: string;
  baseCurrency: string;
  plan: TenantPlan;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantEnvironmentRecord {
  id: string;
  tenantId: string;
  env: TenantEnvironment;
  status: EnvironmentStatus;
  dbName: string;
  dbHost: string;
  dbPort: number;
  isolationTier: IsolationTier;
  region: string;
  subdomain?: string;
  featureFlags: Record<string, boolean>;
  resourceTier: { cpu: string; memory: string; storageGb: number };
  provisionedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  environment: TenantEnvironment;
  environmentId: string;
  dbName: string;
}

export interface ProvisionEnvironmentInput {
  env: TenantEnvironment;
  region?: string;
  isolationTier?: IsolationTier;
  featureFlags?: Record<string, boolean>;
}

export interface EnvironmentUsageSummary {
  environmentId: string;
  env: TenantEnvironment;
  metrics: {
    apiCalls: number;
    storageGb: number;
    transactions: number;
    messages: number;
    computeHours: number;
  };
  estimatedCostUsd: number;
}

export interface PromoteEnvironmentInput {
  sourceEnv: TenantEnvironment;
  targetEnv: TenantEnvironment;
  includeConfig: boolean;
  includeReferenceData: boolean;
}

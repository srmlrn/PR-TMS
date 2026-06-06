-- TMS Control Plane schema (tenants, environments, usage metering)
-- Tenant operational data lives in separate databases per tenant-environment.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE environment_type AS ENUM ('dev', 'test', 'uat', 'prod');
CREATE TYPE environment_status AS ENUM (
  'pending', 'provisioning', 'active', 'suspended', 'decommissioned'
);
CREATE TYPE tenant_plan AS ENUM ('starter', 'standard', 'pro', 'enterprise');
CREATE TYPE isolation_tier AS ENUM ('shared_pool', 'standard', 'dedicated');

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(8) NOT NULL DEFAULT 'US',
  base_currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  plan tenant_plan NOT NULL DEFAULT 'standard',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenant_environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  env environment_type NOT NULL,
  status environment_status NOT NULL DEFAULT 'pending',
  db_name VARCHAR(128) NOT NULL,
  db_host VARCHAR(255) NOT NULL DEFAULT 'localhost',
  db_port INTEGER NOT NULL DEFAULT 5432,
  isolation_tier isolation_tier NOT NULL DEFAULT 'shared_pool',
  region VARCHAR(32) NOT NULL DEFAULT 'us-west1',
  subdomain VARCHAR(255),
  feature_flags JSONB NOT NULL DEFAULT '{}',
  resource_tier JSONB NOT NULL DEFAULT '{"cpu":"500m","memory":"512Mi","storageGb":5}',
  provisioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, env)
);

CREATE TABLE usage_meters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  environment_id UUID NOT NULL REFERENCES tenant_environments(id) ON DELETE CASCADE,
  metric VARCHAR(64) NOT NULL,
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_env_tenant ON tenant_environments(tenant_id);
CREATE INDEX idx_usage_meters_env ON usage_meters(environment_id, period_start);

-- Demo tenant: Sri Venkateswara Temple
INSERT INTO tenants (id, slug, name, country, base_currency, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'sv-temple',
  'Sri Venkateswara Temple',
  'US',
  'USD',
  'pro'
);

INSERT INTO tenant_environments (tenant_id, env, status, db_name, subdomain, provisioned_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'prod', 'active', 'tms_sv_temple_prod', 'sv-temple.prod', NOW()),
  ('00000000-0000-0000-0000-000000000001', 'uat',  'active', 'tms_sv_temple_uat',  'sv-temple.uat',  NOW()),
  ('00000000-0000-0000-0000-000000000001', 'test', 'active', 'tms_sv_temple_test', 'sv-temple.test', NOW()),
  ('00000000-0000-0000-0000-000000000001', 'dev',  'active', 'tms_sv_temple_dev',  'sv-temple.dev',  NOW());

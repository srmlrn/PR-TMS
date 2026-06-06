# TMS Architecture — Tenants, Environments & Databases

## Recommended model (best suited for PR-TMS)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Control plane** | PostgreSQL (`tms_control`) | Tenants, environments, DB routing, usage meters, billing metadata |
| **Data plane** | PostgreSQL **per tenant-environment** | Isolated operational data (devotees, bookings, donations, etc.) |
| **API** | NestJS + dynamic TypeORM connections | Route each request to the correct tenant-env database |
| **Web** | Next.js | Pass `X-Tenant-Id` + `X-Tenant-Environment` on every API call |
| **Production (GCP)** | GKE Autopilot + Cloud SQL | Namespace per tenant-env (optional); Cloud SQL instance per tier |

### Why database-per-tenant-environment?

Requirements (Section 15) need:
- Self-service dev/test/uat/prod per customer
- Promote UAT → Prod **without cross-tenant data leaks**
- Per-environment metering and billing
- Different config/feature flags per env

**Database-per-tenant-environment** gives the strongest isolation with manageable ops at temple scale (hundreds of tenants × 4 envs = thousands of DBs on one Cloud SQL cluster is fine).

### Tiers (scalability options)

| Tier | Data isolation | Infra | Best for |
|------|---------------|-------|----------|
| **Starter** | Separate DB on shared Cloud SQL | Shared GKE pool | Small temples, cost-sensitive |
| **Standard** | Separate DB + dedicated schema migrations | Shared GKE, env-specific secrets | Most customers |
| **Enterprise** | Dedicated Cloud SQL instance per prod env | Dedicated GKE namespace | Large temples, strict compliance |

Non-prod (dev/test/uat) uses **discounted flat fee**; prod uses **base + metered usage**.

## Request routing

```
Client → API Gateway
  ├─ Subdomain: {tenant}.{env}.templesaas.com  (production)
  └─ Headers: X-Tenant-Id + X-Tenant-Environment  (dev/API)
       ↓
TenantContextMiddleware
  ├─ Resolve tenant + environment from control plane
  ├─ Reject if env suspended or not provisioned
  └─ Attach TenantContext to request
       ↓
TenantConnectionService.getDataSource(tenantId, environment)
  └─ Cached TypeORM DataSource → tenant-env PostgreSQL database
```

## Database naming

```
Control plane:  tms_control
Tenant data:    tms_{tenant_slug}_{env}

Examples:
  tms_sv_temple_prod
  tms_sv_temple_uat
  tms_sv_temple_dev
```

## Environment lifecycle

```
CREATE → PROVISIONING → ACTIVE → SUSPENDED → DECOMMISSIONED
                ↓
         CREATE DATABASE + run migrations + seed (non-prod)
```

**Promote UAT → Prod:** copy configuration + selected reference data; never copy cross-tenant.

## Local development

```bash
docker compose up -d          # PostgreSQL + control plane init
npm run dev:api               # API connects to control plane + provisions demo env DBs
```

Set `STORAGE_MODE=memory` to run without Docker (in-memory stores for domain modules).

## GCP production mapping

| Component | GCP service |
|-----------|-------------|
| Control plane DB | Cloud SQL (small, HA) |
| Tenant-env DBs | Cloud SQL (databases on shared instance or per-tenant for enterprise) |
| API | GKE Autopilot |
| Secrets per env | Secret Manager (`tms/{tenant}/{env}/...`) |
| Provisioning | Terraform + Helm triggered by Platform API |
| Metering | BigQuery or TimescaleDB → Stripe Billing Meters |

# Platform Onboarding, Subscription & Billing — Separation Guide

> **Purpose:** Define what belongs in a **separate tenant onboarding / platform billing portal** vs what stays in the **main TMS temple operations app**, based on the current Pr-TPM codebase and requirements (Sections 15–16).

---

## 1. Executive summary

Pr-TPM is designed as **multi-tenant SaaS** with two data layers:

| Layer | Database | Who uses it |
|-------|----------|-------------|
| **Control plane** | `tms_control` | Platform operator + tenant lifecycle |
| **Data plane** | `tms_{tenant_slug}_{env}` per environment | Temple staff, devotees, day-to-day ops |

Today the **temple operations app** (`apps/web` + operational API modules) is largely built. The **platform operator / onboarding / SaaS billing** surface is only partially implemented (read-only tenant list, provision API without UI, no subscriptions or invoices).

**Recommendation:** Split into **three logical products** sharing `packages/types` and the control-plane API:

1. **TMS Operations App** (current `apps/web`) — tenant-scoped temple management  
2. **Tenant Admin Portal** (subset of ops app or thin companion) — first admin login, branding, invite users  
3. **Platform Console** (new app) — signup, plans, payments to TMS, env provisioning, activate/suspend, metering, invoices  

Each **tenant admin** (`ADMIN` role) sees **only their tenant** (enforced by JWT `tenantId` + `X-Tenant-Id`). **Platform super-admin** (`SUPER_ADMIN`) sees **all tenants**.

---

## 2. Personas and access boundaries

### 2.1 Platform Super Admin (SaaS operator)

| Attribute | Detail |
|-----------|--------|
| **Role** | `SUPER_ADMIN` (`platform@tms.dev` in demo) |
| **Scope** | All tenants, all environments |
| **JWT rule** | May send any `X-Tenant-Id` header (`jwt-auth.guard.ts`) |
| **Default route** | `/platform/tenants` |
| **Responsibilities** | Create tenants, assign plans, provision/suspend envs, view MRR/usage, platform invoices, feature flags |

### 2.2 Tenant Admin (temple administrator)

| Attribute | Detail |
|-----------|--------|
| **Role** | `ADMIN` |
| **Scope** | **Single tenant only** — JWT `tenantId` must match request header |
| **Storage** | `tenant_users` table in control plane (`init-control-plane.sql`) |
| **Default route** | `/admin/dashboard` |
| **Responsibilities** | Devotees, bookings, donations, staff, committees, **temple** Stripe keys, branding, schedules, catalog |
| **Cannot do today** | Create new tenants, change SaaS plan, provision envs (API exists but UI not wired; role blocked on write APIs) |

### 2.3 Temple operational roles

Front desk, priest, accountant, volunteer, committee, devotee — all **tenant-scoped**, no platform or billing access. Defined in `apps/web/src/lib/route-access.ts` and `apps/web/src/lib/roles.ts`.

---

## 3. Critical distinction: three “billing” concepts

The word **subscription** appears in multiple places but means different things. **Do not merge these in one portal.**

| Concept | Who pays whom | Storage today | Portal |
|---------|---------------|---------------|--------|
| **A. Platform SaaS billing** | Temple → TMS operator | `tenants.plan`, `usage_meters` (schema only) | **Platform Console** |
| **B. Devotee operational payments** | Devotee → Temple | Tenant DB `payment_sessions` | **TMS Operations App** |
| **C. Temple recurring (donation/seva)** | Devotee → Temple (recurring) | Tenant DB `donation_subscriptions`, `seva_subscriptions` | **TMS Operations App** (`/admin/subscriptions`) |

**Separate from this app:**

- Platform Console handles **A** only.  
- TMS app handles **B** and **C** via `payments/*`, `donations/subscriptions`, `bookings/subscriptions`.

---

## 4. Current implementation inventory

### 4.1 Control plane (implemented)

**Schema:** `infra/postgres/init-control-plane.sql`

| Table | Purpose | Writable API? |
|-------|---------|---------------|
| `tenants` | slug, name, plan, `is_active` | Read only |
| `tenant_environments` | dev/test/uat/prod, status, `db_name`, flags | Provision POST (super-admin); no suspend UI |
| `usage_meters` | Per-env metrics | No ingestion writers |
| `tenant_site_settings` | Branding, hours | PATCH via `/settings/*` (tenant admin) |
| `tenant_payment_settings` | Temple Stripe keys | PATCH via `/settings/payments` |
| `tenant_users` | Login accounts per tenant | CRUD via `/users` (tenant admin) |

**API module:** `apps/api/src/modules/platform/`

| Endpoint | Roles | Status |
|----------|-------|--------|
| `GET /platform/context` | Authenticated | ✅ |
| `GET /platform/tenants` | SUPER_ADMIN | ✅ |
| `GET /platform/tenants/:id` | SUPER_ADMIN, ADMIN | ✅ |
| `GET /platform/tenants/:id/environments` | SUPER_ADMIN, ADMIN | ✅ |
| `POST /platform/tenants/:id/environments` | SUPER_ADMIN | ✅ (postgres); UI not wired |
| `POST /platform/tenants/:id/environments/promote` | SUPER_ADMIN | ⚠️ Config copy only |
| `GET /platform/tenants/:id/usage` | SUPER_ADMIN, ADMIN | ⚠️ Estimated; fake fallbacks |

**Missing platform APIs:**

- `POST /platform/tenants` — onboard new customer  
- `PATCH /platform/tenants/:id` — activate/deactivate, change plan  
- `PATCH /platform/tenants/:id/environments/:envId` — suspend / resume / decommission  
- Subscription, invoice, payment method (SaaS), metering ingest webhooks  

### 4.2 Web UI (implemented)

| App area | Path | Audience |
|----------|------|----------|
| Platform (read-only) | `/platform/tenants` | SUPER_ADMIN only |
| Tenant admin | `/admin/*` (22 pages) | ADMIN |
| Tenant settings | `/admin/settings`, branding, payments, schedules, catalog | ADMIN |
| Operational subscriptions | `/admin/subscriptions` | ADMIN (donation/seva recurring — **not SaaS**) |

**Overlap:** Tenant admin **Settings** page calls platform read APIs (environments, usage) for **their** tenant — appropriate for a **cost dashboard widget**, not full platform console.

### 4.3 Data plane (tenant DB — stays in TMS app)

All modules under `apps/api/src/modules/` except `platform`, `auth` (partial), and `settings` (control-plane writes):

- Devotee, booking, donation, payment, frontdesk, committee, event, finance, staff, volunteer, etc.  
- Entities: `apps/api/src/database/entities/tenant/`  

**Routing:** `TenantContextMiddleware` → `TenantResolverService` → `TenantConnectionService`  
**Headers:** `X-Tenant-Id`, `X-Tenant-Environment` (`apps/web/src/lib/api/client.ts`)

### 4.4 Types (`packages/types`)

| File | Platform relevance |
|------|-------------------|
| `platform.ts` | `Tenant`, `TenantEnvironmentRecord`, `TenantPlan`, usage summaries |
| `settings.ts` | Temple branding / Stripe (tenant self-service) |
| `payment.ts` | Devotee checkout sessions (operational) |
| `donation.ts`, `seva-subscription.ts` | Temple recurring (operational) |

**Missing for platform portal:** `PlatformSubscription`, `Invoice`, `OnboardingState`, `MeterEvent`, `PlanEntitlement`.

---

## 5. What to separate from the main TMS app

### 5.1 Extract → **Platform Console** (new: `apps/platform-web` + extend `platform` API)

These are **cross-tenant** or **customer lifecycle** concerns:

| Feature | Rationale |
|---------|-----------|
| **Tenant signup / onboarding wizard** | Legal entity, temple profile, plan selection, payment method | No temple staff need during daily ops |
| **Tenant CRUD** | Create, activate, deactivate, offboard | Operator-only |
| **SaaS subscription & plans** | Starter / Standard / Pro / Enterprise, add-ons, trials, proration | Stripe Billing / Customer portal |
| **Platform payment collection** | Card on file for TMS invoice | Different webhooks from devotee PaymentIntents |
| **Environment allocation** | Create dev/test/uat/prod, tier, region | Infra-privileged; triggers DB + Terraform |
| **Environment lifecycle** | Suspend, resume, decommission, promote UAT→prod | Operator + optionally tenant admin (self-service UAT) |
| **Usage metering pipeline** | Ingest API calls, storage, messages, transactions | Writers to `usage_meters`; hourly aggregation |
| **Invoicing & cost dashboard** | Per-env breakdown, overages, alerts | Requirements §15.6 |
| **Super-admin dashboard** | All tenants, MRR, health, quotas | `/platform/tenants` is start of this |
| **Global feature flags / entitlements** | Module gating by plan | Enforced at API gateway or middleware |
| **Audit log (platform)** | Who provisioned, suspended, changed plan | Compliance |

**API boundary:** All routes under `/api/v1/platform/*` plus new `/api/v1/billing/*` — **only** `tms_control` database, no tenant DB connection.

**Auth:** Separate login domain optional (`console.tms.dev`); roles: `SUPER_ADMIN`, `PLATFORM_SUPPORT`. Tenant admins **do not** access this app.

### 5.2 Keep → **TMS Operations App** (`apps/web`)

| Feature | Rationale |
|---------|-----------|
| Devotee CRM, bookings, donations, POS, front desk | Core product |
| Committees, events, prasadam, sponsors, rentals | Temple operations |
| Priest / volunteer / accountant / committee portals | Role-specific workflows |
| `/admin/settings/branding` | Temple self-service (writes `tenant_site_settings`) |
| `/admin/settings/payments` | **Temple’s** Stripe for devotee revenue |
| `/admin/settings/schedules`, catalog | Operational config |
| `/admin/subscriptions` | Donation/seva **recurring to temple** |
| `POST /payments/sessions` | Devotee checkout |
| Environment **switcher** (read-only) | Dev/test against same tenant |
| Staff user management (`/admin/people/users`) | `tenant_users` for **their** temple |

**Optional link-out:** Settings page button “Manage subscription & environments” → deep link to Platform Console (tenant admin view) instead of embedding provision UI.

### 5.3 Shared / thin **Tenant onboarding entry** (could live in either app)

First-time flow after platform creates tenant:

1. Platform sends invite email to temple admin  
2. Admin sets password, completes branding wizard  
3. Admin invites staff  
4. Redirect to `/admin/dashboard`  

This can be **Phase 1 routes in TMS app** (`/onboarding/*`) backed by control-plane APIs, later moved to Platform Console tenant-facing tab.

---

## 6. Proposed target architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PLATFORM CONSOLE (new)                            │
│  Signup · Plans · SaaS billing · Env provision · Suspend · Metering    │
│  Users: SUPER_ADMIN, billing ops                                       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    Control Plane API (/platform, /billing)
                                │
                    PostgreSQL: tms_control
                    (tenants, envs, subscriptions, invoices, meters, users)
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
 tms_sv_temple_prod    tms_ganesha_prod         tms_{slug}_{env}
        │                       │
        └───────────┬───────────┘
                    │
        ┌───────────▼───────────────────────────────────────────┐
        │              TMS OPERATIONS APP (existing)               │
        │  Admin · Front desk · Devotee · Committee · Priest ...   │
        │  Users: ADMIN + operational roles (single tenant)        │
        └─────────────────────────────────────────────────────────┘
```

### Request flow (unchanged for operations)

```
Browser (TMS app)
  → Headers: Authorization, X-Tenant-Id, X-Tenant-Environment
  → TenantResolverService checks tenants.is_active + env.status
  → TenantConnectionService → correct tenant DB
```

### Request flow (platform console)

```
Browser (Platform app)
  → Headers: Authorization (SUPER_ADMIN or tenant billing contact)
  → PlatformService → tms_control only
  → Provisioner → CREATE DATABASE / Terraform (async job)
```

---

## 7. Tenant admin: “only their tenant” — enforcement

| Layer | Mechanism | File |
|-------|-----------|------|
| **JWT** | `tenantId` claim on login | `auth.service.ts`, `packages/types/src/auth.ts` |
| **API guard** | Non–super-admin must match `X-Tenant-Id` | `apps/api/src/common/guards/jwt-auth.guard.ts` |
| **Roles** | `ADMIN` cannot call `POST /platform/tenants/.../environments` | `platform.controller.ts` |
| **Web routes** | `canAccessPath` — admin only `/admin/*` | `apps/web/src/lib/route-access.ts` |
| **Data** | All operational queries scoped by tenant connection | `TenantDataService` |

**Gap:** Super-admin can impersonate any tenant via header — needed for support; should add **audit log** in platform portal.

**Gap:** Tenant admin can **read** usage/environments — good for transparency; should not **write** provision without explicit product decision (requirements allow self-service UAT).

---

## 8. Feature matrix: who does what

| Capability | Platform Super Admin | Tenant Admin | Temple staff |
|------------|---------------------|--------------|--------------|
| Create tenant | ✅ | ❌ | ❌ |
| Activate / deactivate tenant | ✅ | ❌ | ❌ |
| Choose / upgrade SaaS plan | ✅ (operator) or ✅ (self-service portal) | View only or self-upgrade | ❌ |
| Pay TMS subscription | ✅ (billing contact) | ✅ if designated | ❌ |
| Provision environment | ✅ | 🔶 Self-service UAT (future) | ❌ |
| Suspend environment | ✅ | ❌ | ❌ |
| View usage / invoice (SaaS) | ✅ all tenants | ✅ own tenant | ❌ |
| Branding / logo | ✅ override | ✅ | ❌ |
| Temple Stripe (devotee payments) | ❌ | ✅ | ❌ |
| Devotees / bookings / donations | 🔶 Support impersonation | ✅ | Role-based |
| Donation recurring subscriptions | ❌ | ✅ `/admin/subscriptions` | ❌ |
| Manage temple users | ✅ (support) | ✅ `/admin/people/users` | ❌ |

---

## 9. Subscription, payment & allocation (requirements mapping)

### 9.1 Subscription (platform — Section 16)

| Requirement | Implementation target |
|-------------|----------------------|
| Plan tiers (starter → enterprise) | `tenants.plan` enum exists; add `subscriptions` table + Stripe Customer |
| Add-ons (livestream, extra env) | `subscription_items` or feature_flags |
| Free trial | `trial_ends_at` on tenant or subscription |
| Proration on upgrade | Stripe Billing proration |
| Entitlements | Middleware checks plan + flags before enabling modules |

### 9.2 Payments (platform)

| Type | Provider | Webhook route |
|------|----------|---------------|
| SaaS subscription charges | Stripe Billing | **New** `/billing/webhooks/stripe` |
| Devotee one-time | Per-tenant Stripe | Existing `/payments/webhooks/stripe` |
| Devotee INR | Razorpay (global keys today) | Existing `/payments/webhooks/razorpay` |

**Keep webhooks separate** — different signing secrets and idempotency stores.

### 9.3 Allocation (environments)

| Action | Control plane field | Automation |
|--------|---------------------|------------|
| Allocate prod slot | `tenant_environments` row | `EnvironmentProvisionerService` |
| Tier | `isolation_tier`, `resource_tier` | Terraform `infra/terraform/modules/tenant-environment/` |
| Region | `region` | GCP region selector in portal |
| Feature flags | `feature_flags` JSONB | Copied on promote |

**Activate tenant:** `tenants.is_active = true` → resolver allows login  
**Deactivate tenant:** `is_active = false` → all envs unreachable (already enforced in `tenant-resolver.service.ts`)  
**Suspend env:** `status = suspended` → blocked per env without deleting data  

---

## 10. Gap analysis (today vs target)

| Area | Schema | API | UI | Production |
|------|--------|-----|-----|------------|
| Control / tenant DB split | ✅ | ✅ | — | Local dev |
| List tenants / envs | ✅ | ✅ | ✅ read-only | Partial |
| Create tenant / onboarding | ❌ | ❌ | ❌ | ❌ |
| Tenant activate/deactivate | ✅ column | ❌ | Display only | ❌ |
| Env provision | ✅ | ✅ POST | Button no handler | Local |
| Env suspend/decommission | ✅ | Enforce only | ❌ | ❌ |
| Usage metering ingest | ✅ table | ❌ writers | Estimated UI | ❌ |
| Platform SaaS billing | Req only | ❌ | ❌ | ❌ |
| Devotee Stripe/Razorpay | ✅ tenant DB | ✅ | Admin payments | Demo + live |
| Donation recurring | ✅ tenant DB | Stub billing | Admin subscriptions | ❌ |

---

## 11. Recommended repo structure (future)

```
Pr-TPM/
├── apps/
│   ├── api/                    # NestJS — add modules: billing, onboarding
│   ├── web/                    # TMS operations (tenant-scoped)
│   └── platform-web/           # NEW — platform console (optional monorepo app)
├── packages/
│   ├── types/                  # Add platform-billing.ts
│   └── ui/                     # Shared components (optional split themes)
├── infra/
│   ├── postgres/               # Add migrations: subscriptions, invoices
│   └── terraform/
└── docs/
    └── PLATFORM_ONBOARDING_AND_BILLING.md  # this file
```

**Alternative:** Platform Console as **separate repository** consuming `@tms/types` and public Platform API — better for SaaS operator security boundary.

---

## 12. Phased delivery plan

### Phase 0 — Document & harden boundaries (now)

- [x] Control plane schema  
- [ ] Document three billing domains (this doc)  
- [ ] Remove platform write actions from tenant admin nav  
- [ ] Add audit log table in control plane  

### Phase 1 — Platform Console MVP

- `POST /platform/tenants` + onboarding wizard UI  
- `PATCH /platform/tenants/:id` (active, plan)  
- Stripe Customer + Subscription for SaaS  
- Super-admin: create tenant → provision prod → invite admin email  

### Phase 2 — Tenant self-service billing

- Tenant admin **read-only** cost dashboard (already partial in `/admin/settings`)  
- Link to Stripe Customer Portal for payment method / invoice PDF  
- Self-service **UAT** environment create (requirements AC1)  

### Phase 3 — Metering & invoices

- Meter event writers (API middleware → queue → `usage_meters`)  
- Hourly aggregation → Stripe Billing Meters  
- Invoice line items per environment  

### Phase 4 — Full lifecycle

- Promote UAT → prod (data + config)  
- Suspend / decommission workflows  
- Terraform/GitOps trigger from provision API  

---

## 13. Files to reference when building

| Concern | Path |
|---------|------|
| Architecture | `docs/ARCHITECTURE.md` |
| Requirements §15–16 | `requirements/REQUIREMENTS.md` |
| Control plane SQL | `infra/postgres/init-control-plane.sql` |
| Platform API | `apps/api/src/modules/platform/` |
| Provisioner | `apps/api/src/database/environment-provisioner.service.ts` |
| Tenant resolver | `apps/api/src/database/tenant-resolver.service.ts` |
| JWT tenant scope | `apps/api/src/common/guards/jwt-auth.guard.ts` |
| Web route access | `apps/web/src/lib/route-access.ts` |
| Platform UI | `apps/web/src/app/(app)/platform/tenants/page.tsx` |
| Admin settings (env usage) | `apps/web/src/app/(app)/admin/settings/page.tsx` |
| Temple payment settings | `apps/api/src/modules/settings/` + `/admin/settings/payments` |
| Devotee payments | `apps/api/src/modules/payment/` |
| Operational subscriptions | `apps/web/src/app/(app)/admin/subscriptions/page.tsx` |
| Platform types | `packages/types/src/platform.ts` |
| Demo users | `apps/api/src/modules/auth/demo-users.ts` |

---

## 14. Decisions needed before build

1. **Self-service vs operator-provisioned:** Can tenant admins create UAT themselves, or only platform ops?  
2. **Single app vs two apps:** Platform Console subdomain vs `/platform/*` inside current Next.js app.  
3. **Billing provider:** Stripe Billing only, or Razorpay for IN temples paying TMS in INR?  
4. **Tenant admin SaaS visibility:** Full invoice history in TMS settings vs redirect to Platform Portal only.  
5. **RLS vs database-per-tenant:** Codebase uses **database-per-tenant-env**; requirements mention RLS for MVP — align strategy.  

---

## 15. Summary

| Question | Answer |
|----------|--------|
| Can we separate onboarding/billing from TMS? | **Yes** — strong natural boundary at control plane vs tenant DB. |
| What moves out? | Tenant signup, SaaS plans, platform payments, env allocation, suspend/activate, metering, invoices, super-admin console. |
| What stays? | All temple operations, devotee payments, donation/seva recurring, branding, temple Stripe, staff/committee workflows. |
| Do tenant admins see only their tenant? | **Yes** — enforced today; platform console is separate audience. |
| What exists today? | Foundation + read-only platform UI + provision API stub; **no** SaaS billing or onboarding. |

---

*Generated from Pr-TPM codebase audit — June 2026.*

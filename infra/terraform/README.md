# TMS GCP Infrastructure (Terraform)

This directory defines the **control plane** shared resources and **per-tenant-environment** isolation for Temple Management System (TMS) on Google Cloud.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Control plane (single Cloud SQL instance)                  │
│  Database: tms_control                                      │
│  Tables: tenants, tenant_environments, usage_meters          │
└──────────────────────────┬──────────────────────────────────┘
                           │
         Platform API POST /platform/tenants/:id/environments
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Per tenant-env (Terraform module: tenant-environment)      │
│  • Cloud SQL database: tms_{tenant_slug}_{env}                │
│  • GKE namespace: tms-{tenant_slug}-{env}                     │
│  • Secret Manager: DB connection string for API pods          │
└─────────────────────────────────────────────────────────────┘
```

Each tenant can have up to four environments (`dev`, `test`, `uat`, `prod`). Every environment gets its own PostgreSQL database on the shared Cloud SQL instance and a dedicated Kubernetes namespace for API workloads.

## Layout

| Path | Purpose |
|------|---------|
| `main.tf` | Root module — provider, shared Cloud SQL instance, module invocations |
| `modules/tenant-environment/` | Creates DB, namespace, and secrets for one tenant-env |

## Platform API → Terraform apply flow

When an operator provisions a new environment via the Platform API:

1. **API writes control-plane record** — `POST /platform/tenants/:tenantId/environments` inserts a row in `tenant_environments` with `status = pending` and a computed `db_name` (e.g. `tms_svt_fremont_prod`).

2. **Provisioner triggers Terraform** — `EnvironmentProvisionerService` (or a CI job subscribed to environment events) runs:
   ```bash
   terraform apply \
     -var="project_id=${GCP_PROJECT}" \
     -var="region=${GCP_REGION}" \
     -var='tenant_environments=[{"tenant_slug":"svt-fremont","env":"prod","tenant_id":"..."}]'
   ```
   In production this is typically executed by Cloud Build, GitHub Actions, or Terraform Cloud with a workspace per control-plane region—not inline from the API process.

3. **Module creates resources** — For each entry in `tenant_environments`, the `tenant-environment` module:
   - Creates a `google_sql_database` on the shared instance
   - Creates a GKE namespace and Kubernetes secret with the JDBC/connection URL
   - Outputs the database name and namespace for Helm values

4. **API marks environment active** — After a successful apply (webhook or polling), the provisioner sets `status = active` and `provisioned_at`. The NestJS `EnvironmentProvisionerService.provisionEnvironment()` performs the equivalent locally for dev (direct `CREATE DATABASE`).

5. **Helm deploy** — `infra/helm/tms-api` is upgraded with the new namespace and secret reference so API pods connect to the tenant-env database.

## Local development

For local Postgres (see `infra/postgres/init-control-plane.sql`), skip Terraform and let the API provision databases directly when `STORAGE_MODE=postgres`.

## Prerequisites

- GCP project with Cloud SQL Admin, Secret Manager, and GKE APIs enabled
- Terraform ≥ 1.5, `google` provider ≥ 5.0
- Existing GKE cluster (referenced in root module)

## Usage

```bash
cd infra/terraform
terraform init
terraform plan -var="project_id=my-project" -var="region=us-west1"
terraform apply -var="project_id=my-project" -var="region=us-west1"
```

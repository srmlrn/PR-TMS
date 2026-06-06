terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

locals {
  db_name   = "tms_${replace(var.tenant_slug, "-", "_")}_${var.environment}"
  namespace = "tms-${var.tenant_slug}-${var.environment}"
}

# Per-tenant-env database on shared Cloud SQL instance
resource "google_sql_database" "tenant" {
  name     = local.db_name
  instance = var.cloud_sql_instance
}

# Secret Manager entry for DB connection (consumed by GKE via Workload Identity)
resource "google_secret_manager_secret" "db_url" {
  secret_id = "${local.namespace}-db-url"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_url" {
  secret      = google_secret_manager_secret.db_url.id
  secret_data = "postgresql://tms_app@${var.cloud_sql_instance}/${local.db_name}"
}

# GKE namespace for tenant-env API pods
resource "kubernetes_namespace" "tenant" {
  metadata {
    name = local.namespace
    labels = {
      "tms.io/tenant-id"  = var.tenant_id
      "tms.io/tenant-slug" = var.tenant_slug
      "tms.io/environment" = var.environment
    }
  }
}

resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "tms-db-credentials"
    namespace = kubernetes_namespace.tenant.metadata[0].name
  }

  data = {
    DATABASE_URL = google_secret_manager_secret_version.db_url.secret_data
    TENANT_ID    = var.tenant_id
    ENVIRONMENT  = var.environment
  }

  type = "Opaque"
}

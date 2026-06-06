terraform {
  required_version = ">= 1.5.0"

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

provider "google" {
  project = var.project_id
  region  = var.region
}

# Shared Cloud SQL instance (control plane + tenant-env databases)
resource "google_sql_database_instance" "tms" {
  name             = var.cloud_sql_instance_name
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = var.cloud_sql_tier
  }

  deletion_protection = var.deletion_protection
}

resource "google_sql_database" "control_plane" {
  name     = "tms_control"
  instance = google_sql_database_instance.tms.name
}

# Per tenant-environment resources
module "tenant_environment" {
  source   = "./modules/tenant-environment"
  for_each = { for e in var.tenant_environments : "${e.tenant_slug}-${e.env}" => e }

  project_id          = var.project_id
  region              = var.region
  cloud_sql_instance  = google_sql_database_instance.tms.name
  tenant_id           = each.value.tenant_id
  tenant_slug         = each.value.tenant_slug
  environment         = each.value.env
  gke_cluster_name    = var.gke_cluster_name
  gke_cluster_location = var.gke_cluster_location
}

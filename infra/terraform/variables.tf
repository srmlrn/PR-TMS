variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud SQL and regional resources"
  type        = string
  default     = "us-west1"
}

variable "cloud_sql_instance_name" {
  description = "Name of the shared Cloud SQL instance"
  type        = string
  default     = "tms-postgres"
}

variable "cloud_sql_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-custom-2-7680"
}

variable "deletion_protection" {
  description = "Prevent accidental deletion of the Cloud SQL instance"
  type        = bool
  default     = true
}

variable "gke_cluster_name" {
  description = "GKE cluster hosting TMS API workloads"
  type        = string
  default     = "tms-gke"
}

variable "gke_cluster_location" {
  description = "Zone or region of the GKE cluster"
  type        = string
  default     = "us-west1-a"
}

variable "tenant_environments" {
  description = "List of tenant environments to provision"
  type = list(object({
    tenant_id   = string
    tenant_slug = string
    env         = string
  }))
  default = []
}

output "control_plane_database" {
  value = google_sql_database.control_plane.name
}

output "tenant_environments" {
  value = {
    for k, m in module.tenant_environment : k => {
      database_name = m.database_name
      namespace     = m.namespace
      secret_id     = m.secret_id
    }
  }
}

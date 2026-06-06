variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "cloud_sql_instance" {
  description = "Cloud SQL instance name hosting tenant databases"
  type        = string
}

variable "tenant_id" {
  type = string
}

variable "tenant_slug" {
  type = string
}

variable "environment" {
  description = "Tenant environment (dev, test, uat, prod)"
  type        = string
}

variable "gke_cluster_name" {
  type = string
}

variable "gke_cluster_location" {
  type = string
}

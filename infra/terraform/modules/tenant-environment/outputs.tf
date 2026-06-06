output "database_name" {
  value = google_sql_database.tenant.name
}

output "namespace" {
  value = kubernetes_namespace.tenant.metadata[0].name
}

output "secret_id" {
  value = google_secret_manager_secret.db_url.secret_id
}

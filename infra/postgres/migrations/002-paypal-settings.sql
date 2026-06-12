-- Run once on existing control-plane DBs (safe to re-run):
--   psql -U tms -d tms_control -f infra/postgres/migrations/002-paypal-settings.sql

ALTER TABLE tenant_payment_settings
  ADD COLUMN IF NOT EXISTS paypal_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tenant_payment_settings
  ADD COLUMN IF NOT EXISTS paypal_mode VARCHAR(8) NOT NULL DEFAULT 'test';

ALTER TABLE tenant_payment_settings
  ADD COLUMN IF NOT EXISTS paypal_client_id VARCHAR(255);

ALTER TABLE tenant_payment_settings
  ADD COLUMN IF NOT EXISTS paypal_client_secret VARCHAR(255);

ALTER TABLE tenant_payment_settings
  ADD COLUMN IF NOT EXISTS paypal_webhook_id VARCHAR(64);

-- Run once on existing control-plane DBs (safe to re-run):
--   psql -U tms -d tms_control -f infra/postgres/migrations/001-stripe-terminal-settings.sql

ALTER TABLE tenant_payment_settings
  ADD COLUMN IF NOT EXISTS stripe_terminal_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tenant_payment_settings
  ADD COLUMN IF NOT EXISTS stripe_terminal_location_id VARCHAR(64);

ALTER TABLE tenant_payment_settings
  ADD COLUMN IF NOT EXISTS stripe_terminal_default_reader_id VARCHAR(64);

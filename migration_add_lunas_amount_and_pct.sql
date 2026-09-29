-- Migration: add "Jumlah Pelunasan" tracking and budget-split percentages.
-- Run this once against your existing Aiven database (via DBeaver SQL editor).
-- Safe to run even if you already ran migration_add_dp_lunas_by.sql before.

ALTER TABLE categories
  ADD COLUMN lunas_amount BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER dp_amount;

INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('rafi_pct', '50'),
  ('sharly_pct', '50')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

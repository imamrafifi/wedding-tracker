-- Migration: add "Dp by", "Lunas by", and "Jumlah DP" tracking to categories.
-- Run this once against your existing Aiven database (via DBeaver SQL editor).

ALTER TABLE categories
  ADD COLUMN dp_by     VARCHAR(20) NOT NULL DEFAULT '' AFTER note,
  ADD COLUMN lunas_by  VARCHAR(20) NOT NULL DEFAULT '' AFTER dp_by,
  ADD COLUMN dp_amount BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER lunas_by;

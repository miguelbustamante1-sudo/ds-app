-- Purpose: Add MDM inventory columns (device name, OS version, blueprint, tags, last check-in) to lap_laptops
-- Date: 2026-07-29
-- Table: ds.lap_laptops

ALTER TABLE ds.lap_laptops
  ADD COLUMN IF NOT EXISTS lap_device_name    VARCHAR(250),
  ADD COLUMN IF NOT EXISTS lap_os_version     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lap_blueprint_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS lap_tags           TEXT[],
  ADD COLUMN IF NOT EXISTS lap_last_check_in  TIMESTAMPTZ;

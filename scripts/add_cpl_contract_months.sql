-- Purpose: Add cpl_contract_months to cpl_corporate_phone_lines
-- Date: 2026-06-03
-- Table: ds.cpl_corporate_phone_lines

ALTER TABLE ds.cpl_corporate_phone_lines
  ADD COLUMN IF NOT EXISTS cpl_contract_months INTEGER;

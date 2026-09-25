-- ============================================================================
-- Purpose: Restore CHECK constraints on ds.cdf_watched_fields
-- Date    : 2026-09-18
-- Issue   : Prisma schema DSL cannot express CHECK constraints, so db push
--           created the columns as unconstrained text. The Object/Field
--           Manager screen offers these values as dropdowns; these
--           constraints keep direct SQL writes honest too.
-- Note    : Postgres has no ADD CONSTRAINT IF NOT EXISTS, hence the guards.
--           Also mirrored into scripts/seed.sql, which is the only file the
--           local setup actually executes.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cdf_data_type') THEN
    ALTER TABLE ds.cdf_watched_fields
      ADD CONSTRAINT chk_cdf_data_type CHECK (cdf_data_type IN
        ('text', 'number', 'boolean', 'date', 'datetime', 'picklist'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cdf_comparison_mode') THEN
    ALTER TABLE ds.cdf_watched_fields
      ADD CONSTRAINT chk_cdf_comparison_mode CHECK (cdf_comparison_mode IN
        ('exact', 'case_insensitive', 'numeric_tolerance', 'date_only'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cdf_significance') THEN
    ALTER TABLE ds.cdf_watched_fields
      ADD CONSTRAINT chk_cdf_significance CHECK (cdf_significance IN
        ('material', 'informational'));
  END IF;
END $$;

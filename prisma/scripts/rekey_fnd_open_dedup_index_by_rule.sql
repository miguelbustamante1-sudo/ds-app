-- ============================================================================
-- Purpose: Add rul_id to the open-finding dedup key so change-engine findings
--          and state-rule findings on the same field do not collide
-- Date    : 2026-09-23
-- Table   : ds.fnd_findings
-- Issue   : uq_fnd_open_entity_field allowed one open finding per
--           (entity_type, entity_id, field_path). ds.fn_run_state_rules()
--           writes to the same table and the same fields (e.g. director), so a
--           rule violation on a field that already had an open change finding
--           raised a unique violation and rolled back the whole rules run.
-- Design  : rul_id is the discriminator. Change-engine findings always have
--           rul_id NULL, and NULLS NOT DISTINCT keeps them at one open finding
--           per field — the invariant supersede depends on. Rule findings get
--           one open finding per (entity, field, rule), so two rules on the
--           same field do not collide either.
-- Note    : The new key is strictly finer than the old one, so existing rows
--           cannot violate it. Drop + create run in one transaction so there is
--           no window without the guarantee. Mirrored into scripts/seed.sql.
--           Supersedes prisma/scripts/replace_fnd_open_dedup_index.sql.
-- ============================================================================

BEGIN;

DROP INDEX IF EXISTS ds.uq_fnd_open_entity_field;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fnd_open_entity_field
    ON ds.fnd_findings (cde_entity_type, fnd_entity_id, cdf_field_path, rul_id)
    NULLS NOT DISTINCT
    WHERE status = 'open';

COMMIT;

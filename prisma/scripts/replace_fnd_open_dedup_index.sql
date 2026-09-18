-- ============================================================================
-- Purpose: Re-key the open-finding dedup guarantee from fingerprint to
--          (entity_type, entity_id, field_path)
-- Date    : 2026-09-18
-- Issue   : uq_fnd_open_fingerprint was UNIQUE (fnd_fingerprint) WHERE
--           status='open'. The fingerprint is md5(entity_type : entity_id :
--           field_path : new_value), so it changes whenever the drifted value
--           changes. Two open findings for the same field with different
--           drifted values therefore had different fingerprints and both were
--           permitted — exactly the supersede case the reconciliation handles.
--           Keying on the columns themselves makes the invariant real.
-- Note    : cdf_field_path is nullable (entity-level findings), so NULLS NOT
--           DISTINCT is required or those rows would never dedup. Requires
--           PG 15+. Mirrored into scripts/seed.sql.
-- ============================================================================

DROP INDEX IF EXISTS ds.uq_fnd_open_fingerprint;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fnd_open_entity_field
    ON ds.fnd_findings (cde_entity_type, fnd_entity_id, cdf_field_path)
    NULLS NOT DISTINCT
    WHERE status = 'open';

-- ============================================================================
-- Purpose: CREATE VIEW for open findings — read-only exposure
-- Date    : 2026-09-18
-- Schema  : es (public view)
-- Depends : ds.fnd_findings, ds.cde_watched_entities
-- ============================================================================

CREATE OR REPLACE VIEW es.v_open_findings AS
SELECT
    f.fnd_id,
    f.cde_entity_type,
    e.cde_label       AS entity_label,
    f.fnd_entity_id,
    f.cdf_field_path,
    f.old_value,
    f.new_value,
    f.severity,
    f.status,
    f.assignee,
    f.first_seen,
    f.win_id
FROM ds.fnd_findings f
JOIN ds.cde_watched_entities e ON e.cde_entity_type = f.cde_entity_type
WHERE f.status = 'open';

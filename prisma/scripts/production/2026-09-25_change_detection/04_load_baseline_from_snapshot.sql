-- ============================================================================
-- Change Detection — 04 LOAD BASELINE FROM SNAPSHOT (data, run by hand)
-- Date    : 2026-09-25
-- Runbook : docs/technical/change-detection-production-deployment.md (step "Load the baseline")
--
-- Turns the snapshot you just uploaded into the approved baseline
-- (ds.aps_approved_state) — the values the change engine compares every later
-- snapshot against.
--
-- Before running:
--   1. The watched entity exists (Object & Field Manager). aps_approved_state has a
--      foreign key to it, so this fails without it.
--   2. The first snapshot is uploaded (Data Import → "Entity Snapshot" template).
--   3. Replace <your email> below.
--
-- Safe by design: only entities WITHOUT a baseline get one (ON CONFLICT DO NOTHING);
-- an existing baseline is never overwritten. Later changes to a baseline happen
-- through the review workflow (Agree), not through this script.
-- Not audited through the app (manual SQL) — aps_approved_by records who loaded it.
-- ============================================================================

BEGIN;

INSERT INTO ds.aps_approved_state (cde_entity_type, aps_entity_id, aps_payload, aps_approved_by, aps_approved_at)
SELECT DISTINCT ON (s.snp_entity_type, s.snp_entity_id)
       s.snp_entity_type, s.snp_entity_id, s.snp_payload, 'baseline load: <your email>', now()
  FROM es.snp_entity_snapshot s
 WHERE s.snp_entity_type = 'project'
 ORDER BY s.snp_entity_type, s.snp_entity_id, s.snp_loaded_at DESC   -- latest load wins if an entity appears twice
ON CONFLICT (cde_entity_type, aps_entity_id) DO NOTHING;

-- Review before committing: baselines vs. snapshot rows for the entity type.
SELECT (SELECT count(*) FROM ds.aps_approved_state WHERE cde_entity_type = 'project')                       AS baselines,
       (SELECT count(DISTINCT snp_entity_id) FROM es.snp_entity_snapshot WHERE snp_entity_type = 'project')  AS snapshot_entities;

-- COMMIT if the numbers look right, otherwise ROLLBACK.
COMMIT;

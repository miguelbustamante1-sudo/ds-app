-- ============================================================
-- Purpose : Align the free-text tms_seniority column with the
--           authoritative tier/band catalog so display surfaces are
--           consistent. Standardizes level on the catalog (DEC-005).
-- Date    : 2026-07-11
-- Spec    : ds-app-endorsement-hiring (TD-003, DEC-005)
-- Table   : ds.tbl_team_members
-- Notes   : Non-destructive. Only rewrites tms_seniority for rows that
--           HAVE a tier band, copying tib_description. No column is
--           dropped — retiring tms_seniority is a separate DB-team
--           decision once the app reads tier/band everywhere.
--           Safe to re-run.
-- ============================================================

UPDATE ds.tbl_team_members tm
SET tms_seniority = tb.tib_description
FROM ds.tib_tier_band tb
WHERE tm.tib_id = tb.tib_id
  AND (tm.tms_seniority IS DISTINCT FROM tb.tib_description);

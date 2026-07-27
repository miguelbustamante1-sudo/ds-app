-- ============================================================
-- Purpose : Add endorsement skill/group/job-profile/billing-currency
--           columns and the hiring team-lead column.
-- Date    : 2026-07-11
-- Spec    : ds-app-endorsement-hiring (FR-001, FR-002, FR-003, FR-005, FR-008)
-- Tables  : ds.end_endorsements
--           ds.hir_hiring
-- Notes   : Columns are nullable so existing rows remain valid.
--           Depends on endorsement_hiring_catalogs.sql (run that first).
-- ============================================================


-- ------------------------------------------------------------
-- 1. Endorsement: skill, group, derived job profile, billing currency
-- ------------------------------------------------------------
ALTER TABLE ds.end_endorsements
  ADD COLUMN IF NOT EXISTS skl_id INTEGER REFERENCES ds.skl_skill(skl_id);          -- FR-001

ALTER TABLE ds.end_endorsements
  ADD COLUMN IF NOT EXISTS grp_id INTEGER REFERENCES ds.grp_group(grp_id);          -- FR-002

ALTER TABLE ds.end_endorsements
  ADD COLUMN IF NOT EXISTS jbp_id INTEGER REFERENCES ds.jbp_job_profile(jbp_id);    -- FR-003 (derived, stored for record)

ALTER TABLE ds.end_endorsements
  ADD COLUMN IF NOT EXISTS end_billing_rate_currency TEXT;                          -- FR-005

CREATE INDEX IF NOT EXISTS idx_end_endorsements_skl_id ON ds.end_endorsements (skl_id);
CREATE INDEX IF NOT EXISTS idx_end_endorsements_grp_id ON ds.end_endorsements (grp_id);
CREATE INDEX IF NOT EXISTS idx_end_endorsements_jbp_id ON ds.end_endorsements (jbp_id);


-- ------------------------------------------------------------
-- 2. Hiring: team lead captured at the final hiring stage (FR-008)
--    Captured/displayed only; the supervisor assignment stays a
--    separate maintenance step (per decision — partial DEC-002).
-- ------------------------------------------------------------
ALTER TABLE ds.hir_hiring
  ADD COLUMN IF NOT EXISTS hir_team_lead_id INTEGER REFERENCES ds.tbl_team_members(tms_id);

CREATE INDEX IF NOT EXISTS idx_hir_hiring_team_lead_id
  ON ds.hir_hiring (hir_team_lead_id);

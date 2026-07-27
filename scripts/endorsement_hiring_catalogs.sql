-- ============================================================
-- Purpose : Create the endorsement/hiring level catalogs and the
--           position+tier/band+skill+group -> Workday job profile mapping.
-- Date    : 2026-07-11
-- Spec    : ds-app-endorsement-hiring (FR-001, FR-002, FR-003, DEC-001)
-- Tables  : ds.skl_skill
--           ds.grp_group
--           ds.jbp_job_profile
--           ds.jpm_job_profile_mapping
-- Notes   : All statements are idempotent (IF NOT EXISTS guards).
--           Thin lookup tables mirror ds.tib_tier_band / ds.pos_positions.
--           Mapping ROWS are loaded separately by José (TASK-001) — this
--           script only creates the structure.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Skill catalog (FR-001: BU / Premium)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.skl_skill (
  skl_id   SERIAL PRIMARY KEY,
  skl_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO ds.skl_skill (skl_name)
VALUES ('BU'), ('Premium')
ON CONFLICT (skl_name) DO NOTHING;


-- ------------------------------------------------------------
-- 2. Group catalog (FR-002: A / B / C / D)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.grp_group (
  grp_id   SERIAL PRIMARY KEY,
  grp_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO ds.grp_group (grp_name)
VALUES ('A'), ('B'), ('C'), ('D')
ON CONFLICT (grp_name) DO NOTHING;


-- ------------------------------------------------------------
-- 3. Job Profile catalog (FR-003: Workday job profile names)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.jbp_job_profile (
  jbp_id   SERIAL PRIMARY KEY,
  jbp_name TEXT NOT NULL UNIQUE
);


-- ------------------------------------------------------------
-- 4. Job Profile mapping (DEC-001 / TASK-001)
--    position + tier/band + skill + group -> job profile
--    Rows loaded by José; structure only here.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.jpm_job_profile_mapping (
  jpm_id SERIAL PRIMARY KEY,
  pos_id INTEGER NOT NULL REFERENCES ds.pos_positions(pos_id),
  tib_id INTEGER NOT NULL REFERENCES ds.tib_tier_band(tib_id),
  skl_id INTEGER NOT NULL REFERENCES ds.skl_skill(skl_id),
  grp_id INTEGER NOT NULL REFERENCES ds.grp_group(grp_id),
  jbp_id INTEGER NOT NULL REFERENCES ds.jbp_job_profile(jbp_id),
  CONSTRAINT uq_jpm_job_profile_mapping UNIQUE (pos_id, tib_id, skl_id, grp_id)
);

CREATE INDEX IF NOT EXISTS idx_jpm_job_profile_mapping_jbp_id
  ON ds.jpm_job_profile_mapping (jbp_id);

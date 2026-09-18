-- ============================================================
-- Purpose : Derive Group (A/B/C/D), Job Profile name, and Job Code
--           from Position + Main Technology + Tier/Band + Skill,
--           and populate the existing (still-empty) job profile
--           catalog from that formula instead of loading it by hand.
-- Date    : 2026-09-17
-- Spec    : ds-app-endorsement-profile-matrix
-- Sources : _docs/requirements/proposal-job-profile-group-classification-2026-09.md
--           Catalogo TICA DS Verificacion de TLs -- tabs Groups, Catalogo GT,
--           Catalogo SV, DS TICA Matrix
-- Confirmed by Jose Ruiz (2026-09-17, Google Doc comments):
--   1. Formula confirmed: JobProfileName = BaseTitle + Roman(Skill) + GroupLetter
--      "As of today this logic is correct."
--   2. "All kind of Architect are considered within Group D."
--   3. "every Technology Analyst must be within Group B" -- the one
--      contradicting "Sr. Technology Analyst IC" row (GT+SV, DS906023IC,
--      T4 Band 1 BAU) has NO Position SFR label in the source sheet, so it
--      is not reproduced by this script at all (only the labeled
--      "Technology Specialist" -> Group B row is). Pending Arturo's
--      confirmation on whether that IC row is a sheet error; does not
--      block this script.
--   4. Career track (IC vs People Manager) is explicitly out of scope --
--      ds.pbc_position_base_code keys only on (pos_id, tib_id).
--   5. "There is a catalog already created for positions ... Just re-use
--      it." -- every table below is keyed off the EXISTING
--      ds.pos_positions / ds.tib_tier_band, no new position catalog.
--
-- Known open items NOT seeded here (left unmapped -> app falls back to
-- the manual picker for these, nothing breaks):
--   - Configuration Engineer (3-way QA/Dev/PM split, not a technology axis)
--   - Software Delivery Manager (no group value in any source)
--   - Network Project Manager, Web Developer (not in ds.pos_positions)
--   - Admin Team Leader, AGM, Business Support Analyst, Content Manager,
--     CRM, Data Scientist, Sr. Director, ERP Analysts, Operations Manager,
--     Product Owner, Financial Analyst, Certinia PM, Trainee (zero coverage)
--   - Technical Leader @ T4 Band 2 (source data has two conflicting base
--     titles at this cell -- "Applications Development Module Lead" vs
--     "Application Support Module Lead" -- needs a decision, not guessed)
--   - Business Systems Analyst is seeded as fixed Group C (the BAU case).
--     Groups.csv actually shows this position varies by SKILL, not
--     Technology (Premium -> D) -- this was dropped from the proposal Jose
--     reviewed, so his approval doesn't cover the Premium/D case. Flagged
--     as a separate follow-up; not a blocker for this seed.
--
-- Notes   : All statements are idempotent (IF NOT EXISTS / ON CONFLICT
--           guards) and safe to re-run.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Technology catalog (new -- only positions that actually vary by
--    technology need a row here; today that's Back End Developer only)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.tec_technology (
  tec_id   SERIAL PRIMARY KEY,
  tec_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO ds.tec_technology (tec_name)
VALUES ('Java'), ('.NET'), ('JavaScript'), ('Python'), ('NodeJS')
ON CONFLICT (tec_name) DO NOTHING;


-- ------------------------------------------------------------
-- 2. Position (+ Technology) -> Group mapping
--    Keyed off the EXISTING ds.pos_positions (Jose's point 5) and the
--    EXISTING ds.grp_group. tec_id NULL = the position's fixed group
--    regardless of technology.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.pgm_position_group_mapping (
  pgm_id SERIAL PRIMARY KEY,
  pos_id INTEGER NOT NULL REFERENCES ds.pos_positions(pos_id),
  tec_id INTEGER REFERENCES ds.tec_technology(tec_id),
  grp_id INTEGER NOT NULL REFERENCES ds.grp_group(grp_id)
);

-- one fixed-group row per position (tec_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pgm_fixed_group
  ON ds.pgm_position_group_mapping (pos_id) WHERE tec_id IS NULL;

-- one row per (position, technology) for positions that vary
CREATE UNIQUE INDEX IF NOT EXISTS uq_pgm_position_technology
  ON ds.pgm_position_group_mapping (pos_id, tec_id) WHERE tec_id IS NOT NULL;

INSERT INTO ds.pgm_position_group_mapping (pos_id, tec_id, grp_id)
SELECT p.pos_id, t.tec_id, g.grp_id
FROM (VALUES
  -- Group A
  ('Application Support', NULL, 'A'),
  ('Data Analyst',         NULL, 'A'),
  ('QA Manual',            NULL, 'A'),
  -- Group B
  ('QA Automation',          NULL, 'B'),
  ('Technology Specialist',  NULL, 'B'),
  ('Back End Developer',     'Java', 'B'),
  ('Back End Developer',     '.NET', 'B'),
  -- Group C
  ('Network Admin',          NULL, 'C'),
  ('Project Manager',        NULL, 'C'),
  ('Scrum Master',           NULL, 'C'),
  ('SDET',                   NULL, 'C'),
  ('Front End Developer',    NULL, 'C'),
  ('Full Stack Developer',   NULL, 'C'),
  ('UI/UX',                  NULL, 'C'),
  ('Mobile Developer',       NULL, 'C'),
  ('IVR Developer',          NULL, 'C'),
  ('Business Systems Analyst', NULL, 'C'),   -- fixed BAU case; see header note
  ('Back End Developer',     'JavaScript', 'C'),
  ('Back End Developer',     'Python', 'C'),
  ('Back End Developer',     'NodeJS', 'C'),
  -- Group D
  ('DevOps Engineer',   NULL, 'D'),
  ('DBA',               NULL, 'D'),
  ('Technical Leader',  NULL, 'D'),
  ('Software Architect', NULL, 'D')          -- Jose: "All kind of Architect ... Group D"
) AS v(pos_name, tec_name, grp_name)
JOIN ds.pos_positions p ON p.pos_name = v.pos_name
JOIN ds.grp_group g ON g.grp_name = v.grp_name
LEFT JOIN ds.tec_technology t ON t.tec_name = v.tec_name
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- 3. Position + Tier/Band -> Base Title / Base Code
--    (replaces the vetoed "job family" catalog -- keyed directly off the
--    EXISTING ds.pos_positions / ds.tib_tier_band, per Jose's point 5)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.pbc_position_base_code (
  pbc_id         SERIAL PRIMARY KEY,
  pos_id         INTEGER NOT NULL REFERENCES ds.pos_positions(pos_id),
  tib_id         INTEGER NOT NULL REFERENCES ds.tib_tier_band(tib_id),
  pbc_base_title TEXT NOT NULL,
  pbc_base_code  VARCHAR(20) NOT NULL,
  CONSTRAINT uq_pbc_position_base_code UNIQUE (pos_id, tib_id)
);

INSERT INTO ds.pbc_position_base_code (pos_id, tib_id, pbc_base_title, pbc_base_code)
SELECT p.pos_id, tb.tib_id, v.base_title, v.base_code
FROM (VALUES
  ('Application Support', 'T2 Band 1', 'TIDS Service Desk Analyst', 'DS921021'),
  ('Application Support', 'T3 Band 1', 'Application Support Analyst', 'DS905021'),
  ('Application Support', 'T3 Band 2', 'Intermediate Application Support Analyst', 'DS905022'),

  ('Back End Developer', 'T3 Band 1', 'Applications Developer', 'DS901421'),
  ('Back End Developer', 'T3 Band 2', 'Intermediate Applications Developer', 'DS901422'),
  ('Back End Developer', 'T4 Band 1', 'Sr. Applications Developer', 'DS901423'),
  ('Back End Developer', 'T4 Band 2', 'Sr. Applications Development Specialist', 'DS901026'),
  ('Back End Developer', 'T5 Band 1', 'Lead Applications Developer Analyst', 'DS901035'),

  ('Business Systems Analyst', 'T4 Band 1', 'Sr. Business Analyst', 'DS912023'),
  ('Business Systems Analyst', 'T4 Band 2', 'Sr. Business Specialist', 'DS912026'),

  ('DBA', 'T4 Band 2', 'TIDS Sr. Database Administrator Specialist', 'DS910026'),

  ('DevOps Engineer', 'T3 Band 2', 'Technology Analyst', 'DS906022'),
  ('DevOps Engineer', 'T4 Band 1', 'Sr. Technology Specialist', 'DS906026'),

  ('Front End Developer', 'T3 Band 2', 'Intermediate Applications Developer', 'DS901422'),
  ('Front End Developer', 'T4 Band 1', 'Sr. Applications Developer', 'DS901423'),
  ('Front End Developer', 'T4 Band 2', 'Sr. Applications Development Specialist', 'DS901026'),

  ('Full Stack Developer', 'T3 Band 1', 'Applications Developer', 'DS901421'),
  ('Full Stack Developer', 'T3 Band 2', 'Intermediate Applications Developer', 'DS901422'),
  ('Full Stack Developer', 'T4 Band 1', 'Sr. Applications Developer', 'DS901423'),
  ('Full Stack Developer', 'T4 Band 2', 'Sr. Applications Development Specialist', 'DS901026'),
  ('Full Stack Developer', 'T5 Band 1', 'Lead Applications Developer Analyst', 'DS901035'),

  ('IVR Developer', 'T3 Band 1', 'Applications Developer', 'DS901421'),
  ('IVR Developer', 'T3 Band 2', 'Intermediate Applications Developer', 'DS901422'),
  ('IVR Developer', 'T4 Band 1', 'Sr. Applications Developer', 'DS901423'),

  ('Mobile Developer', 'T4 Band 1', 'Sr. Applications Developer', 'DS901423'),

  ('Network Admin', 'T4 Band 1', 'Sr. Network Analyst', 'DS918023'),

  ('Project Manager', 'T3 Band 1', 'Project Co-ordinator', 'DS915415'),
  ('Project Manager', 'T3 Band 2', 'Sr. Project Co-ordinator', 'DS915416'),
  ('Project Manager', 'T4 Band 1', 'Associate Project Manager', 'DS915090'),
  ('Project Manager', 'T4 Band 2', 'Project Manager', 'DS915091'),
  ('Project Manager', 'T5 Band 1', 'Sr. Project Manager', 'DS915094'),

  ('QA Automation', 'T3 Band 1', 'TIDS Software Quality Assurance Analyst', 'DS902021'),
  ('QA Automation', 'T3 Band 2', 'TIDS Intermediate Software Quality Assurance Analyst', 'DS902022'),
  ('QA Automation', 'T4 Band 1', 'TIDS Sr. Software Quality Assurance Analyst', 'DS902023'),
  ('QA Automation', 'T4 Band 2', 'TIDS Sr. Software Quality Assurance Specialist', 'DS902026'),
  ('QA Automation', 'T5 Band 1', 'TIDS Lead Software Quality Assurance Analyst', 'DS902035'),

  ('QA Manual', 'T3 Band 1', 'TIDS Software Quality Assurance Analyst', 'DS902021'),
  ('QA Manual', 'T3 Band 2', 'TIDS Intermediate Software Quality Assurance Analyst', 'DS902022'),
  -- T4B1 has two conflicting labels in the source ("Sr." vs "Intermediate")
  -- for the identical tier+code (DS902023) -- picked "Sr." to match the
  -- Sr./T4B1 naming convention used everywhere else in the matrix.
  ('QA Manual', 'T4 Band 1', 'TIDS Sr. Software Quality Assurance Analyst', 'DS902023'),
  ('QA Manual', 'T4 Band 2', 'TIDS Sr. Software Quality Assurance Specialist', 'DS902026'),

  ('Scrum Master', 'T3 Band 1', 'Scrum Master', 'DS915025'),

  ('Software Architect', 'T6 Band 1', 'TIDS Applications Development Architect', 'DS901222'),

  -- Technical Leader @ T4B2 deliberately omitted -- source has two
  -- conflicting titles at that cell (Applications Development Module Lead
  -- / DS901049 vs Application Support Module Lead / DS905049) with no way
  -- to tell which applies from the data alone.
  ('Technical Leader', 'T5 Band 1', 'Applications Development Technical Team Leader', 'DS901045'),

  ('Technology Specialist', 'T4 Band 1', 'Sr. Technology Analyst', 'DS906023'),
  ('Technology Specialist', 'T4 Band 2', 'Sr. Technology Specialist', 'DS906026'),

  ('UI/UX', 'T5 Band 1', 'Lead Applications Developer Analyst', 'DS901035')
) AS v(pos_name, tib_code, base_title, base_code)
JOIN ds.pos_positions p ON p.pos_name = v.pos_name
JOIN ds.tib_tier_band tb ON tb.tib_description = v.tib_code
ON CONFLICT (pos_id, tib_id) DO NOTHING;


-- ------------------------------------------------------------
-- 4. Job Profile catalog gets a Job Code column (additive, non-breaking --
--    the app has never derived Job Code before)
-- ------------------------------------------------------------
ALTER TABLE ds.jbp_job_profile ADD COLUMN IF NOT EXISTS jbp_job_code VARCHAR(20);


-- ------------------------------------------------------------
-- 5. Generate the Job Profile catalog + mapping from the formula:
--      JobProfileName = BaseTitle + ' ' + Roman(Skill) + GroupLetter
--      JobCode        = BaseCode        + Roman(Skill) + GroupLetter
--    This is the fix for TASK-001 (jpm_job_profile_mapping was empty) --
--    generated from the formula instead of loaded row by row.
-- ------------------------------------------------------------

-- 5a. insert any job profile names/codes that don't exist yet
INSERT INTO ds.jbp_job_profile (jbp_name, jbp_job_code)
SELECT DISTINCT
  pbc.pbc_base_title || ' ' ||
    (CASE skl.skl_name WHEN 'BU' THEN 'I' WHEN 'Premium' THEN 'II' END) ||
    grp.grp_name AS jbp_name,
  pbc.pbc_base_code ||
    (CASE skl.skl_name WHEN 'BU' THEN 'I' WHEN 'Premium' THEN 'II' END) ||
    grp.grp_name AS jbp_job_code
FROM ds.pbc_position_base_code pbc
JOIN (SELECT DISTINCT pos_id, grp_id FROM ds.pgm_position_group_mapping) dpg
  ON dpg.pos_id = pbc.pos_id
JOIN ds.grp_group grp ON grp.grp_id = dpg.grp_id
CROSS JOIN ds.skl_skill skl
ON CONFLICT (jbp_name) DO NOTHING;

-- 5b. map every (position, tier/band, skill, group) combo to its job profile
INSERT INTO ds.jpm_job_profile_mapping (pos_id, tib_id, skl_id, grp_id, jbp_id)
SELECT pbc.pos_id, pbc.tib_id, skl.skl_id, dpg.grp_id, jp.jbp_id
FROM ds.pbc_position_base_code pbc
JOIN (SELECT DISTINCT pos_id, grp_id FROM ds.pgm_position_group_mapping) dpg
  ON dpg.pos_id = pbc.pos_id
JOIN ds.grp_group grp ON grp.grp_id = dpg.grp_id
CROSS JOIN ds.skl_skill skl
JOIN ds.jbp_job_profile jp ON jp.jbp_name =
  pbc.pbc_base_title || ' ' ||
    (CASE skl.skl_name WHEN 'BU' THEN 'I' WHEN 'Premium' THEN 'II' END) ||
    grp.grp_name
ON CONFLICT (pos_id, tib_id, skl_id, grp_id) DO NOTHING;


-- ------------------------------------------------------------
-- Verification (run after the above)
-- ------------------------------------------------------------
-- SELECT COUNT(*) FROM ds.pgm_position_group_mapping;   -- expect 23
-- SELECT COUNT(*) FROM ds.pbc_position_base_code;        -- expect 46
-- SELECT COUNT(*) FROM ds.jpm_job_profile_mapping;       -- expect > 0, was 0 before this script
-- SELECT jbp_name, jbp_job_code FROM ds.jbp_job_profile ORDER BY jbp_name LIMIT 20;

-- ============================================================
-- Reference Data Seed
-- Run after Prisma migrations to populate the database with
-- all reference/lookup data required for the app to function.
--
-- This script is idempotent ΓÇö safe to run multiple times.
--
-- NOTE: The dev-user section at the bottom (section 8+) is
-- for local development only. Do NOT run those blocks in prod.
-- In prod, real users are created on first OneLogin login.
-- ============================================================

-- 1. Time Off Statuses
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (1, 'Tentative')   ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (2, 'Acknowledged') ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (3, 'Taken')       ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (4, 'Cancelled')   ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (5, 'Rejected')    ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (6, 'Split')       ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (7, 'InAuth')      ON CONFLICT (sta_id) DO NOTHING;

-- 2. Regions
INSERT INTO ds.reg_regions (reg_id, reg_name) VALUES (1, 'Central America') ON CONFLICT (reg_id) DO NOTHING;
INSERT INTO ds.reg_regions (reg_id, reg_name) VALUES (2, 'North America')   ON CONFLICT (reg_id) DO NOTHING;

-- 3. Countries
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso, cou_currency_symbol, cou_night_start, cou_night_end, cou_night_multiplier) VALUES (1, 'El Salvador',             1,    'SV', 'USD', 18, 6, 1.25) ON CONFLICT (cou_id) DO NOTHING;
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso, cou_currency_symbol, cou_night_start, cou_night_end, cou_night_multiplier) VALUES (2, 'Guatemala',                1,    'GT', 'QTZ', 18, 6, 1.25) ON CONFLICT (cou_id) DO NOTHING;
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso, cou_currency_symbol, cou_night_start, cou_night_end, cou_night_multiplier) VALUES (3, 'Mexico',                   1,    'MX', 'MXN', 18, 6, 1.25) ON CONFLICT (cou_id) DO NOTHING;
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso, cou_currency_symbol, cou_night_start, cou_night_end, cou_night_multiplier) VALUES (5, 'Canada',                   2,    'CA', 'USD', 18, 6, 1.25) ON CONFLICT (cou_id) DO NOTHING;
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso, cou_currency_symbol, cou_night_start, cou_night_end, cou_night_multiplier) VALUES (6, 'United States of America', 2,    'US', 'USD', 18, 6, 1.25) ON CONFLICT (cou_id) DO NOTHING;
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso, cou_currency_symbol, cou_night_start, cou_night_end, cou_night_multiplier) VALUES (7, 'India',                    NULL, 'IN', 'USD', 18, 6, 1.25) ON CONFLICT (cou_id) DO NOTHING;

-- 4. Tier Bands
INSERT INTO ds.tib_tier_band (tib_id, tib_description) VALUES (1,  'T2B1') ON CONFLICT (tib_id) DO NOTHING;
INSERT INTO ds.tib_tier_band (tib_id, tib_description) VALUES (2,  'T2B2') ON CONFLICT (tib_id) DO NOTHING;
INSERT INTO ds.tib_tier_band (tib_id, tib_description) VALUES (3,  'T3B1') ON CONFLICT (tib_id) DO NOTHING;
INSERT INTO ds.tib_tier_band (tib_id, tib_description) VALUES (4,  'T3B2') ON CONFLICT (tib_id) DO NOTHING;
INSERT INTO ds.tib_tier_band (tib_id, tib_description) VALUES (5,  'T4B1') ON CONFLICT (tib_id) DO NOTHING;
INSERT INTO ds.tib_tier_band (tib_id, tib_description) VALUES (6,  'T4B2') ON CONFLICT (tib_id) DO NOTHING;
INSERT INTO ds.tib_tier_band (tib_id, tib_description) VALUES (7,  'T5B1') ON CONFLICT (tib_id) DO NOTHING;
INSERT INTO ds.tib_tier_band (tib_id, tib_description) VALUES (8,  'T5B2') ON CONFLICT (tib_id) DO NOTHING;
INSERT INTO ds.tib_tier_band (tib_id, tib_description) VALUES (9,  'T6B1') ON CONFLICT (tib_id) DO NOTHING;
INSERT INTO ds.tib_tier_band (tib_id, tib_description) VALUES (10, 'N/A')  ON CONFLICT (tib_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.tib_tier_band', 'tib_id'), (SELECT MAX(tib_id) FROM ds.tib_tier_band));

-- 5. Time Off Categories
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (1,  'Bench',                'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (2,  'Bereavement',          'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (3,  'Budget Constraint',    'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (4,  'Fixed Price',          'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (5,  'Holiday Swap',         'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (6,  'LOA',                  'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (7,  'Marriage leave',       'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (8,  'Maternity Leave',      'Female') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (9,  'Medical leave',        'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (10, 'Misc Non-Billable Time','Both')  ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (11, 'Onshore days off',     'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (12, 'Paternity leave',      'Male')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (13, 'Personal Day',         'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (14, 'Vacation',             'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (15, 'JANP',                 'Both')   ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name, tot_gender) VALUES (16, 'Personal Time Off',    'Both')   ON CONFLICT (tot_id) DO NOTHING;

-- 5. Positions
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (1,  'Admin Team Leader',      'Admin Team Leader')      ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (2,  'AGM',                    'AGM')                    ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (3,  'Application Support',    'Application Support')    ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (4,  'Back End Developer',     'Back End Developer')     ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (5,  'Business Support Analyst','Business Support Analyst') ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (6,  'Business Systems Analyst','Business Systems Analyst') ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (7,  'Configuration Engineer', 'Configuration Engineer') ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (8,  'Content Manager',        'Content Manager')        ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (9,  'CRM',                    'CRM')                    ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (10, 'Data Analyst',           'Data Analyst')           ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (11, 'Data Scientist',         'Data Scientist')         ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (12, 'DBA',                    'DBA')                    ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (13, 'DevOps Engineer',        'DevOps Engineer')        ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (14, 'Director',               'Director')               ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (15, 'ERP Analysts',           'ERP Analysts')           ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (16, 'Front End Developer',    'Front End Developer')    ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (17, 'Full Stack Developer',   'Full Stack Developer')   ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (18, 'IVR Developer',          'IVR Developer')          ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (19, 'Mobile Developer',       'Mobile Developer')       ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (20, 'Network Admin',          'Network Admin')          ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (21, 'Operations Manager',     'Operations Manager')     ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (22, 'Product Owner',          'Product Owner')          ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (23, 'Project Manager',        'Project Manager')        ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (24, 'QA Automation',          'QA Automation')          ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (25, 'QA Manual',              'QA Manual')              ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (26, 'Scrum Master',           'Scrum Master')           ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (27, 'SDET',                   'SDET')                   ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (28, 'Software Architect',     'Software Architect')     ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (29, 'Software Delivery Manager','Software Delivery Manager') ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (30, 'Technical Leader',       'Technical Leader')       ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (31, 'Technology Specialist',  'Technology Specialist')  ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (32, 'UI/UX',                  'UI/UX')                  ON CONFLICT (pos_id) DO NOTHING;
INSERT INTO ds.pos_positions (pos_id, pos_name, pos_description) VALUES (33, 'Financial Analyst',      'Financial Analyst')      ON CONFLICT (pos_id) DO NOTHING;

-- 6. Category x Country mappings
-- Columns: tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days,
--          ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days
-- El Salvador (cou_id=1)
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (1,  1, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (2,  1, 1, true,  2,    false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (3,  1, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (4,  1, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (5,  1, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (6,  1, 1, false, NULL, false, false, 0,  30) ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (7,  1, 1, true,  5,    false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (8,  1, 1, true,  112,  false, true,  0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (9,  1, 1, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (10, 1, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (11, 1, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (12, 1, 1, true,  5,    false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (13, 1, 1, true,  1,    false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (14, 1, 1, false, NULL, false, true,  7,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;

-- Guatemala (cou_id=2)
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (1,  2, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (2,  2, 1, true,  3,    false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (3,  2, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (4,  2, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (5,  2, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (6,  2, 1, false, NULL, false, false, 0,  30) ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (7,  2, 1, true,  5,    false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (8,  2, 1, true,  84,   false, true,  0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (9,  2, 1, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (10, 2, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (11, 2, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (12, 2, 1, true,  5,    false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (14, 2, 1, false, NULL, false, false, 7,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;

-- Mexico (cou_id=3)
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (1,  3, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (2,  3, 1, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (3,  3, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (4,  3, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (5,  3, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (6,  3, 1, false, NULL, false, false, 0,  30) ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (9,  3, 1, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (10, 3, 0, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (15, 3, 1, false, NULL, false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar, ttc_days_before, ttc_max_days) VALUES (16, 3, 1, true,  1,    false, false, 0,  0)  ON CONFLICT (tot_id, cou_id) DO NOTHING;

-- 7. Security Roles (RBAC)
INSERT INTO sec.rol_roles (rol_id, rol_name, rol_description, created_at) VALUES (1, 'admin', 'Administrator', now()) ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO sec.rol_roles (rol_id, rol_name, rol_description, created_at) VALUES (2, 'user',  'Standard user', now()) ON CONFLICT (rol_id) DO NOTHING;

-- 8. RBAC Options
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (1,  'Countries',               NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (2,  'Projects',                NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (3,  'SupervisorAssignments',   NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (4,  'RBACRolePermissions',     NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (5,  'Regions',                 NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (6,  'Roles',                   NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (7,  'RBACPermissions',         NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (8,  'TimeOffCategories',       NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (9,  'RBACRoles',               NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (10, 'TeamMemberProjects',      NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (11, 'RBACUserRoles',           NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (12, 'TimeOffCategoriesByCountry', NULL,                                       '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (13, 'Users',                   NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (14, 'Holidays',                NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (15, 'TeamMembers',             NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (16, 'TimeOffStatuses',         NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (17, 'TimeOffs',                NULL,                                          '2026-02-02 19:24:18.389287+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (18, 'SupervisorTimeOff',       NULL,                                          '2026-02-03 21:34:23.23415+00')  ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (19, 'RBACOptions',             NULL,                                          '2026-02-03 21:34:31.104604+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (20, 'Notifications',           NULL,                                          '2026-02-12 17:10:03.565601+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (21, 'ProjectAssignments',      NULL,                                          '2026-02-14 00:07:15.634176+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (22, 'Endorsements',            NULL,                                          '2026-02-17 00:08:26.684961+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (23, 'TierBands',               NULL,                                          '2026-02-17 23:49:29.140794+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (24, 'Reports',                 NULL,                                          '2026-02-18 17:11:29.90525+00')  ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (25, 'Hiring',                  NULL,                                          '2026-02-19 14:18:48.198262+00') ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (26, 'Clients',                 'miguel.bustamante01@telusinternational.com',  '2026-02-25 12:27:06.641+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (27, 'WorkdayInfo',             'miguel.bustamante01@telusinternational.com',  '2026-03-06 12:43:41.191+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (28, 'FunctionalAreas',         'miguel.bustamante01@telusinternational.com',  '2026-03-06 14:02:59.949+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (29, 'HolidaySwaps',            'miguel.bustamante01@telusinternational.com',  '2026-03-18 21:10:06.954+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (30, 'PendingRequests',         'miguel.bustamante01@telusinternational.com',  '2026-03-26 01:44:51.134+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (31, 'BenchMove',               'miguel.bustamante01@telusinternational.com',  '2026-03-30 20:26:03.424+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (32, 'MyTeam',                  'miguel.bustamante01@telusinternational.com',  '2026-04-15 03:56:49.393+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (33, 'MyProfile',               'miguel.bustamante01@telusinternational.com',  '2026-04-15 03:56:58.725+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (34, 'MyTimeOff',               'miguel.bustamante01@telusinternational.com',  '2026-04-15 03:57:09.567+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (35, 'TimeOffActivity',         'miguel.bustamante01@telusinternational.com',  '2026-04-15 03:57:24.783+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (36, 'PersistenceTables',       'miguel.bustamante01@telusinternational.com',  '2026-04-15 03:57:47.255+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (37, 'NotificationCenter',      'miguel.bustamante01@telusinternational.com',  '2026-04-15 03:58:11.757+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (38, 'TimeOffReview',           'miguel.bustamante01@telusinternational.com',  '2026-04-15 23:00:04.459+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (39, 'BonusCategories',         'miguel.bustamante01@telusinternational.com',  '2026-04-15 23:01:00.000+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (40, 'TimeOffException',        'miguel.bustamante01@telusinternational.com',  '2026-04-24 18:05:30.559+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (41, 'SupervisorHolidaySwaps',  'miguel.bustamante01@telusinternational.com',  '2026-04-27 12:24:15.468+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (42, 'HolidaySwapException',    'miguel.bustamante01@telusinternational.com',  '2026-04-27 18:23:25.937+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (43, 'PersistenceTemplates',    'miguel.bustamante01@telusinternational.com',  '2026-04-28 17:46:32.401+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (44, 'PersistenceDataTypes',    'miguel.bustamante01@telusinternational.com',  '2026-04-28 17:46:49.706+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (45, 'Endorsements',            'miguel.bustamante01@telusinternational.com',  '2026-04-30 00:00:00.000+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (46, 'Shift',                   'miguel.bustamante01@telusinternational.com',  '2026-05-07 23:39:34.007+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (47, 'Positions',               'miguel.bustamante01@telusinternational.com',  '2026-05-10 01:42:07.545+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (49, 'Workflow',                'miguel.bustamante01@telusinternational.com',  '2026-05-24 13:50:35.456+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (50, 'WorkflowAdmin',           'miguel.bustamante01@telusinternational.com',  '2026-05-24 13:50:48.407+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (51, 'CompensatoryTime',        'miguel.bustamante01@telusinternational.com',  '2026-05-24 13:53:01.629+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (52, 'SupervisorCompTime',      'miguel.bustamante01@telusinternational.com',  '2026-05-24 13:53:01.629+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (53, 'PhoneContracts',           NULL                                       ,  '2026-06-03 00:00:01.000+00')    ON CONFLICT (opt_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('sec.opt_options', 'opt_id'), (SELECT MAX(opt_id) FROM sec.opt_options));

-- 9. RBAC Permissions
-- Only insert if the table is empty (no unique constraint to use ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions LIMIT 1) THEN
    -- admin (rol_id=1): full CRUD on all resources
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Countries',                 true, true, true,  'CRUD', NOW(), 1,  1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Projects',                  true, true, true,  'CRUD', NOW(), 2,  1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorAssignments',     true, true, true,  'CRUD', NOW(), 3,  1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACRolePermissions',       true, true, true,  'CRUD', NOW(), 4,  1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Regions',                   true, true, true,  'CRUD', NOW(), 5,  1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Roles',                     true, true, true,  'CRUD', NOW(), 6,  1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACPermissions',           true, true, true,  'CRUD', NOW(), 7,  1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffCategories',         true, true, true,  'CRUD', NOW(), 8,  1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACRoles',                 true, true, true,  'CRUD', NOW(), 9,  1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TeamMemberProjects',        true, true, true,  'CRUD', NOW(), 10, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACUserRoles',             true, true, true,  'CRUD', NOW(), 11, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffCategoriesByCountry',true, true, true,  'CRUD', NOW(), 12, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Users',                     true, true, true,  'CRUD', NOW(), 13, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Holidays',                  true, true, true,  'CRUD', NOW(), 14, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TeamMembers',               true, true, true,  'CRUD', NOW(), 15, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffStatuses',           true, true, true,  'CRUD', NOW(), 16, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffs',                  true, true, true,  'CRUD', NOW(), 17, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorTimeOff',         true, true, true,  NULL,   NOW(), 18, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACOptions',               true, true, true,  NULL,   NOW(), 19, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Notifications',             true, true, true,  'CRUD', NOW(), 20, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('BenchMove',                 true, true, false, NULL,   NOW(), 31, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyTeam',                    true, true, false, NULL,   NOW(), 32, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyProfile',                 true, true, false, NULL,   NOW(), 33, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyTimeOff',                 true, true, false, NULL,   NOW(), 34, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffActivity',           true, true, false, NULL,   NOW(), 35, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('NotificationCenter',        true, true, false, NULL,   NOW(), 37, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('ProjectAssignments',        true, true, true,  NULL,   NOW(), 21, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Endorsements',              true, true, true,  NULL,   NOW(), 22, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TierBands',                 true, true, true,  NULL,   NOW(), 23, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Reports',                   true, true, true,  NULL,   NOW(), 24, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Hiring',                    true, true, true,  NULL,   NOW(), 25, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Clients',                   true, true, true,  NULL,   NOW(), 26, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('WorkdayInfo',               true, true, true,  NULL,   NOW(), 27, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('FunctionalAreas',           true, true, true,  NULL,   NOW(), 28, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('HolidaySwaps',              true, true, true,  NULL,   NOW(), 29, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PendingRequests',           true, true, true,  NULL,   NOW(), 30, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PersistenceTables',         true, true, true,  NULL,   NOW(), 36, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffReview',             true, true, true,  NULL,   NOW(), 38, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffException',          true, true, true,  NULL,   NOW(), 40, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorHolidaySwaps',   true, true, true,  NULL,   NOW(), 41, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('HolidaySwapException',      true, true, false, NULL,   NOW(), 42, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PersistenceTemplates',      true, true, true,  NULL,   NOW(), 43, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PersistenceDataTypes',      true, true, true,  NULL,   NOW(), 44, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Shift',                     true, true, true,  NULL,   NOW(), 46, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Positions',                 true, true, true,  NULL,   NOW(), 47, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Workflow',                  true, true, true,  NULL,   NOW(), 49, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('WorkflowAdmin',             true, true, true,  NULL,   NOW(), 50, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('CompensatoryTime',          true, true, true,  NULL,   NOW(), 51, 1);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorCompTime',        true, true, true,  NULL,   NOW(), 52, 1);
    -- user (rol_id=2): limited access
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Countries',                 true, true, true,  'CRUD', NOW(), 1,  2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Projects',                  true, true, true,  'CRUD', NOW(), 2,  2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorAssignments',     true, true, true,  'CRUD', NOW(), 3,  2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Regions',                   true, true, true,  'CRUD', NOW(), 5,  2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffCategories',         true, true, true,  'CRUD', NOW(), 8,  2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TeamMemberProjects',        true, true, true,  'CRUD', NOW(), 10, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffCategoriesByCountry',true, true, true,  'CRUD', NOW(), 12, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Holidays',                  true, true, true,  'CRUD', NOW(), 14, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TeamMembers',               true, true, true,  'CRUD', NOW(), 15, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffStatuses',           true, true, true,  'CRUD', NOW(), 16, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffs',                  true, true, true,  'CRUD', NOW(), 17, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorTimeOff',         true, true, true,  NULL,   NOW(), 18, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACOptions',               true, true, true,  NULL,   NOW(), 19, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('BenchMove',                 true, true, false, NULL,   NOW(), 31, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyTeam',                    true, true, false, NULL,   NOW(), 32, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyProfile',                 true, true, false, NULL,   NOW(), 33, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyTimeOff',                 true, true, false, NULL,   NOW(), 34, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffActivity',           true, true, false, NULL,   NOW(), 35, 2);
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('NotificationCenter',        true, true, false, NULL,   NOW(), 37, 2);
  END IF;
END $$;

-- Idempotent insert for new permissions on existing databases
DO $$
BEGIN
  -- admin (rol_id=1)
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'MyTeam'              AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyTeam',              true, true,  false, NULL, NOW(), 32, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'MyProfile'           AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyProfile',           true, true,  false, NULL, NOW(), 33, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'MyTimeOff'           AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyTimeOff',           true, true,  false, NULL, NOW(), 34, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'TimeOffActivity'     AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffActivity',     true, true,  false, NULL, NOW(), 35, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'NotificationCenter'  AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('NotificationCenter',  true, true,  false, NULL, NOW(), 37, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'PersistenceTemplates' AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PersistenceTemplates', true, true, true,  NULL, NOW(), 43, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'PersistenceDataTypes' AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PersistenceDataTypes', true, true, true,  NULL, NOW(), 44, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'PersistenceTables'   AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PersistenceTables',   true, true,  true,  NULL, NOW(), 36, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'HolidaySwapException' AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('HolidaySwapException', true, true, false, NULL, NOW(), 42, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'CompensatoryTime'    AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('CompensatoryTime',    true, true,  true,  NULL, NOW(), 51, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Shift'               AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Shift',               true, true, true,  NULL, NOW(), 46, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'ProjectAssignments'  AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('ProjectAssignments',  true, true, true,  NULL, NOW(), 21, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Endorsements'        AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Endorsements',        true, true, true,  NULL, NOW(), 22, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'TierBands'           AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TierBands',           true, true, true,  NULL, NOW(), 23, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Reports'             AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Reports',             true, true, true,  NULL, NOW(), 24, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Hiring'              AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Hiring',              true, true, true,  NULL, NOW(), 25, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Clients'             AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Clients',             true, true, true,  NULL, NOW(), 26, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'WorkdayInfo'         AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('WorkdayInfo',         true, true, true,  NULL, NOW(), 27, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'FunctionalAreas'     AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('FunctionalAreas',     true, true, true,  NULL, NOW(), 28, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'HolidaySwaps'        AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('HolidaySwaps',        true, true, true,  NULL, NOW(), 29, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'PendingRequests'     AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PendingRequests',     true, true, true,  NULL, NOW(), 30, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'TimeOffReview'       AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffReview',       true, true, true,  NULL, NOW(), 38, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'TimeOffException'    AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffException',    true, true, true,  NULL, NOW(), 40, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'SupervisorHolidaySwaps' AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorHolidaySwaps', true, true, true, NULL, NOW(), 41, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Positions'           AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Positions',           true, true, true,  NULL, NOW(), 47, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Workflow'            AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Workflow',            true, true, true,  NULL, NOW(), 49, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'WorkflowAdmin'       AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('WorkflowAdmin',       true, true, true,  NULL, NOW(), 50, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'SupervisorCompTime'  AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorCompTime',  true, true, true,  NULL, NOW(), 52, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'PhoneContracts'       AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PhoneContracts',     true, true, true,  NULL, NOW(), 53, 1); END IF;

  -- user (rol_id=2)
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'MyTeam'              AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyTeam',              true, true,  false, NULL, NOW(), 32, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'MyProfile'           AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyProfile',           true, true,  false, NULL, NOW(), 33, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'MyTimeOff'           AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('MyTimeOff',           true, true,  false, NULL, NOW(), 34, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'TimeOffActivity'     AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffActivity',     true, true,  false, NULL, NOW(), 35, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'NotificationCenter'  AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('NotificationCenter',  true, true,  false, NULL, NOW(), 37, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'PersistenceTemplates' AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PersistenceTemplates', true, true, true,  NULL, NOW(), 43, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'PersistenceDataTypes' AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PersistenceDataTypes', true, true, true,  NULL, NOW(), 44, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'PersistenceTables'   AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PersistenceTables',   true, true,  true,  NULL, NOW(), 36, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'CompensatoryTime'    AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('CompensatoryTime',    true, true,  true,  NULL, NOW(), 51, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Shift'               AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Shift',               true, false, false, NULL, NOW(), 46, 2); END IF;

  -- Hub page permissions added with governance/hub restructure (opt_ids 32-43)
  -- admin (rol_id=1)
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'PendingRequests'       AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PendingRequests',       true, true,  false, NULL, NOW(), 32, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'ProjectAssignments'    AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('ProjectAssignments',    true, true,  false, NULL, NOW(), 33, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'BenchRemove'           AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('BenchRemove',           true, true,  true,  NULL, NOW(), 34, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'HolidaySwaps'          AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('HolidaySwaps',          true, true,  false, NULL, NOW(), 35, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'SupervisorHolidaySwaps'AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorHolidaySwaps',true, true,  false, NULL, NOW(), 36, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'TimeOffReview'         AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffReview',         true, true,  false, NULL, NOW(), 37, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'TimeOffException'      AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffException',      true, true,  false, NULL, NOW(), 38, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'BonusCategories'       AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('BonusCategories',       true, true,  true,  NULL, NOW(), 39, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Clients'               AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Clients',               true, true,  true,  NULL, NOW(), 40, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'FunctionalAreas'       AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('FunctionalAreas',       true, true,  true,  NULL, NOW(), 41, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'TierBands'             AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TierBands',             true, true,  true,  NULL, NOW(), 42, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'WorkdayInfo'           AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('WorkdayInfo',           true, true,  false, NULL, NOW(), 43, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Hiring'                AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Hiring',                true, true,  true,  NULL, NOW(), 44, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Endorsements'          AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Endorsements',          true, true,  true,  NULL, NOW(), 45, 1); END IF;

  -- user (rol_id=2)
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Notifications'         AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Notifications',         true, true,  false, NULL, NOW(), 20, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'PendingRequests'       AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('PendingRequests',       true, true,  false, NULL, NOW(), 32, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'ProjectAssignments'    AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('ProjectAssignments',    true, true,  false, NULL, NOW(), 33, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'BenchRemove'           AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('BenchRemove',           true, false, false, NULL, NOW(), 34, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'HolidaySwaps'          AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('HolidaySwaps',          true, true,  false, NULL, NOW(), 35, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'SupervisorHolidaySwaps'AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorHolidaySwaps',true, true,  false, NULL, NOW(), 36, 2); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'TimeOffReview'         AND rol_id = 2) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffReview',         true, true,  false, NULL, NOW(), 37, 2); END IF;

END $$;

-- Hub permission options (opt_id 31-43) — required for all hub page buttons
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES
  (31, 'Reports',              NOW()),
  (32, 'PendingRequests',      NOW()),
  (33, 'ProjectAssignments',   NOW()),
  (34, 'BenchRemove',          NOW()),
  (35, 'HolidaySwaps',         NOW()),
  (36, 'SupervisorHolidaySwaps', NOW()),
  (37, 'TimeOffReview',        NOW()),
  (38, 'TimeOffException',     NOW()),
  (39, 'BonusCategories',      NOW()),
  (40, 'Clients',              NOW()),
  (41, 'FunctionalAreas',      NOW()),
  (42, 'TierBands',            NOW()),
  (43, 'WorkdayInfo',          NOW()),
  (44, 'Hiring',               NOW()),
  (45, 'Endorsements',         NOW())
ON CONFLICT (opt_id) DO NOTHING;

-- ============================================================
-- DEV ONLY ΓÇö do NOT run in production
-- The blocks below create a local dev user so you can log in
-- with the dev JWT auth flow. In prod, users are provisioned
-- automatically on first OneLogin login.
--
-- IMPORTANT: Update the email to match DEV_USERNAME in .env.local
-- or let setup-local-db.sh inject it via :'dev_email'
-- ============================================================

-- Dev team member
INSERT INTO ds.tbl_team_members (tms_id, tms_names, tms_surnames, tms_stadat, cou_id, tms_seniority, tms_primary_role)
VALUES (1, 'Dev', 'User', CURRENT_DATE, 1, 'Senior', 1) ON CONFLICT (tms_id) DO NOTHING;

-- Dev application user
INSERT INTO ds.tbl_users (usr_id, usr_name, usr_email, usr_role, usr_stadat, tms_id)
VALUES (1, 'Dev User', :'dev_email', 'employee', CURRENT_DATE, 1) ON CONFLICT (usr_id) DO NOTHING;

-- Dev auth user — includes 'bsa' so all role-gated sidebar items are visible in dev
INSERT INTO sec.auth_users (id, onelogin_id, email, first_name, last_name, roles, created_at, updated_at)
VALUES (1, 'dev-1', :'dev_email', 'Dev', 'User', ARRAY['user', 'admin', 'bsa'], now(), now()) ON CONFLICT (id) DO NOTHING;

-- Ensure existing dev DBs also get the full role set (ON CONFLICT DO NOTHING skips the above on re-runs)
UPDATE sec.auth_users SET roles = ARRAY['user', 'admin', 'bsa'] WHERE id = 1;

-- Link dev user to roles (required for permission resolver to work)
INSERT INTO sec.uro_user_roles (usr_id, rol_id) VALUES (1, 1), (1, 2) ON CONFLICT (usr_id, rol_id) DO NOTHING;

-- 10. Persistence Data Types seed data
INSERT INTO di.pdt_persistence_data_types (pdt_index, pdt_name, pdt_regular_expression, pdt_example)
VALUES (1, 'integer', '^[+-]?\d+$', '42')
ON CONFLICT (pdt_index) DO NOTHING;

INSERT INTO di.pdt_persistence_data_types (pdt_index, pdt_name, pdt_regular_expression, pdt_example)
VALUES (2, 'bigint', '^[+-]?\d+$', '9876543210')
ON CONFLICT (pdt_index) DO NOTHING;

INSERT INTO di.pdt_persistence_data_types (pdt_index, pdt_name, pdt_regular_expression, pdt_example)
VALUES (3, 'numeric', '^[+-]?\d+(\.\d+)?$', '3.14')
ON CONFLICT (pdt_index) DO NOTHING;

INSERT INTO di.pdt_persistence_data_types (pdt_index, pdt_name, pdt_regular_expression, pdt_example)
VALUES (4, 'character varying', '^[\s\S]*$', 'hello world')
ON CONFLICT (pdt_index) DO NOTHING;

INSERT INTO di.pdt_persistence_data_types (pdt_index, pdt_name, pdt_regular_expression, pdt_example)
VALUES (5, 'text', '^[\s\S]*$', 'any long text')
ON CONFLICT (pdt_index) DO NOTHING;

INSERT INTO di.pdt_persistence_data_types (pdt_index, pdt_name, pdt_regular_expression, pdt_example)
VALUES (6, 'boolean', '^(true|false|1|0|t|yes|on|no|off)$', 'true')
ON CONFLICT (pdt_index) DO NOTHING;

INSERT INTO di.pdt_persistence_data_types (pdt_index, pdt_name, pdt_regular_expression, pdt_example)
VALUES (7, 'date', '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$', '2025-03-25 00:00:00')
ON CONFLICT (pdt_index) DO NOTHING;

INSERT INTO di.pdt_persistence_data_types (pdt_index, pdt_name, pdt_regular_expression, pdt_example)
VALUES (8, 'timestamp with time zone', '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[\+\-]\d{2}$', '2025-03-25 10:00:00+00')
ON CONFLICT (pdt_index) DO NOTHING;

INSERT INTO di.pdt_persistence_data_types (pdt_index, pdt_name, pdt_regular_expression, pdt_example)
VALUES (9, 'uuid', '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
ON CONFLICT (pdt_index) DO NOTHING;

UPDATE di.pdt_persistence_data_types SET pdt_regular_expression = '^\d{4}-\d{2}-\d{2}$', pdt_example = '2025-03-25'
WHERE pdt_index = 7 AND pdt_name = 'date';

INSERT INTO di.pdt_persistence_data_types (pdt_index, pdt_name, pdt_regular_expression, pdt_example)
VALUES (10, 'timestamp without time zone', '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$', '2025-03-25 10:00:00')
ON CONFLICT (pdt_index) DO NOTHING;

-- Idempotent insert
DO $$
BEGIN
  -- standard shift
  IF NOT EXISTS (SELECT 1 FROM ds.sft_shifts WHERE sft_id = 1) THEN INSERT INTO ds.sft_shifts (sft_id, sft_description, sft_total_week_hours, sft_lunch_hours) VALUES (1, '44 Hours', 44, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM ds.sft_shifts WHERE sft_id = 2) THEN INSERT INTO ds.sft_shifts (sft_id, sft_description, sft_total_week_hours, sft_lunch_hours) VALUES (2, '40 hours', 40, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM ds.sfd_shift_details WHERE sft_id = 1 AND sfd_day_of_week = 0) THEN INSERT INTO ds.sfd_shift_details (sft_id, sfd_day_of_week, sfd_start_time, sfd_end_time, sfd_daily_hours) VALUES (1, 0, 0, 0, 0); END IF;
  IF NOT EXISTS (SELECT 1 FROM ds.sfd_shift_details WHERE sft_id = 1 AND sfd_day_of_week = 1) THEN INSERT INTO ds.sfd_shift_details (sft_id, sfd_day_of_week, sfd_start_time, sfd_end_time, sfd_daily_hours) VALUES (1, 1, 8, 18, 9); END IF;
  IF NOT EXISTS (SELECT 1 FROM ds.sfd_shift_details WHERE sft_id = 1 AND sfd_day_of_week = 2) THEN INSERT INTO ds.sfd_shift_details (sft_id, sfd_day_of_week, sfd_start_time, sfd_end_time, sfd_daily_hours) VALUES (1, 2, 8, 18, 9); END IF;
  IF NOT EXISTS (SELECT 1 FROM ds.sfd_shift_details WHERE sft_id = 1 AND sfd_day_of_week = 3) THEN INSERT INTO ds.sfd_shift_details (sft_id, sfd_day_of_week, sfd_start_time, sfd_end_time, sfd_daily_hours) VALUES (1, 3, 8, 18, 9); END IF;
  IF NOT EXISTS (SELECT 1 FROM ds.sfd_shift_details WHERE sft_id = 1 AND sfd_day_of_week = 4) THEN INSERT INTO ds.sfd_shift_details (sft_id, sfd_day_of_week, sfd_start_time, sfd_end_time, sfd_daily_hours) VALUES (1, 4, 8, 18, 9); END IF;
  IF NOT EXISTS (SELECT 1 FROM ds.sfd_shift_details WHERE sft_id = 1 AND sfd_day_of_week = 5) THEN INSERT INTO ds.sfd_shift_details (sft_id, sfd_day_of_week, sfd_start_time, sfd_end_time, sfd_daily_hours) VALUES (1, 5, 8, 17, 8); END IF;
  IF NOT EXISTS (SELECT 1 FROM ds.sfd_shift_details WHERE sft_id = 1 AND sfd_day_of_week = 6) THEN INSERT INTO ds.sfd_shift_details (sft_id, sfd_day_of_week, sfd_start_time, sfd_end_time, sfd_daily_hours) VALUES (1, 6, 0, 0, 0); END IF;
END $$;

-- team members with no Shift are assigned to the standard one
UPDATE ds.tmp_team_member_project SET sft_id = 1 WHERE sft_id is NULL;

-- set default night schedule and default night hours multiplier.
-- Night starting at 6:00 PM and ending at 6:00 AM.  Compensatory night time multiplier set as 1.25
UPDATE ds.cou_countries SET cou_night_start = 18, cou_night_end = 6, cou_night_multiplier = 1.25 WHERE cou_night_start IS NULL OR cou_night_end IS NULL OR cou_night_multiplier IS NULL;

-- 11. Holidays
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (1,  2, 'New Year''s Day',                                    '2026-01-01', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (2,  2, 'Labor Day',                                         '2026-05-01', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (3,  2, 'Army Day',                                          '2026-06-29', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-05-21 14:35:03.648+00',    'jose.ruiz@telusinternational.com', NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (4,  2, 'Assumption Day (Guatemala City only)',               '2026-08-15', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (5,  2, 'Independence Day',                                  '2026-09-15', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (6,  2, 'Revolution Day',                                    '2026-10-20', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (7,  2, 'All Saints'' Day',                                  '2026-11-01', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (8,  2, 'Christmas Eve (Half Day)',                          '2026-12-24', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (9,  2, 'Christmas Day',                                     '2026-12-25', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (10, 2, 'New Year''s Eve (Half Day)',                        '2026-12-31', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (11, 2, 'Maundy Thursday',                                   '2026-04-02', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (12, 2, 'Good Friday',                                       '2026-04-03', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (13, 2, 'Holy Saturday',                                     '2026-04-04', false, '2026-01-29 11:41:33.22548+00',  'admin_user', '2026-01-29 11:41:33.22548+00',  NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (14, 1, 'New Year''s Day',                                    '2026-01-01', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (15, 1, 'Labor Day',                                         '2026-05-01', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (16, 1, 'Mother''s Day',                                      '2026-05-10', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (17, 1, 'Father''s Day',                                      '2026-06-17', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (18, 1, 'August Bank Holiday (Fiestas Agostinas)',            '2026-08-03', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (19, 1, 'August Bank Holiday (Fiestas Agostinas)',            '2026-08-05', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (20, 1, 'Celebration of San Salvador (Fiestas Agostinas)',    '2026-08-06', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (21, 1, 'Independence Day',                                  '2026-09-15', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (22, 1, 'All Souls'' Day',                                    '2026-11-02', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (23, 1, 'Christmas Day',                                     '2026-12-25', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (24, 1, 'Maundy Thursday',                                   '2026-04-02', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (25, 1, 'Good Friday',                                       '2026-04-03', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (26, 1, 'Holy Saturday',                                     '2026-04-04', false, '2026-01-29 11:42:12.652837+00', 'admin_user', '2026-01-29 11:42:12.652837+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (27, 1, 'New Year''s Day',                                    '2025-01-01', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (28, 1, 'Maundy Thursday',                                   '2025-04-17', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (29, 1, 'Good Friday',                                       '2025-04-18', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (30, 1, 'Holy Saturday',                                     '2025-04-19', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (31, 1, 'Labor Day',                                         '2025-05-01', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (32, 1, 'Mother''s Day',                                      '2025-05-10', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (33, 1, 'Father''s Day',                                      '2025-06-17', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (34, 1, 'Feast of San Salvador',                              '2025-08-06', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (35, 1, 'Independence Day',                                  '2025-09-15', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (36, 1, 'All Souls'' Day',                                    '2025-11-02', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (37, 1, 'Christmas Day',                                     '2025-12-25', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (38, 2, 'New Year''s Day',                                    '2025-01-01', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (39, 2, 'Maundy Thursday',                                   '2025-04-17', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (40, 2, 'Good Friday',                                       '2025-04-18', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (41, 2, 'Holy Saturday',                                     '2025-04-19', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (42, 2, 'Labor Day',                                         '2025-05-01', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (43, 2, 'Army Day',                                          '2025-06-30', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (44, 2, 'Independence Day',                                  '2025-09-15', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (45, 2, 'Revolution Day',                                    '2025-10-20', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (46, 2, 'All Saints'' Day',                                  '2025-11-01', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (47, 2, 'Christmas Eve',                                     '2025-12-24', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, true)  ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (48, 2, 'Christmas Day',                                     '2025-12-25', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (49, 2, 'New Year''s Eve',                                    '2025-12-31', false, '2026-04-24 04:09:11.450655+00', 'admin_user', '2026-04-24 04:09:11.450655+00', NULL,                              NULL, true, true)  ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (50, 3, 'Año Nuevo',                                         '2026-01-01', false, '2026-04-30 16:10:21.535239+00', 'system',       '2026-04-30 16:10:21.535239+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (51, 3, 'Día de la Constitución',                            '2026-02-02', false, '2026-04-30 16:10:21.535239+00', 'system',       '2026-04-30 16:10:21.535239+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (52, 3, 'Natalicio de Benito Juárez',                        '2026-03-16', false, '2026-04-30 16:10:21.535239+00', 'system',       '2026-04-30 16:10:21.535239+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (53, 3, 'Día del Trabajo',                                   '2026-05-01', false, '2026-04-30 16:10:21.535239+00', 'system',       '2026-04-30 16:10:21.535239+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (54, 3, 'Día de la Independencia',                           '2026-09-16', false, '2026-04-30 16:10:21.535239+00', 'system',       '2026-04-30 16:10:21.535239+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (55, 3, 'Día de la Revolución',                              '2026-11-16', false, '2026-04-30 16:10:21.535239+00', 'system',       '2026-04-30 16:10:21.535239+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_updated_by, hol_deleted_at, hol_is_active, hol_is_half_day) VALUES (56, 3, 'Navidad',                                           '2026-12-25', false, '2026-04-30 16:10:21.535239+00', 'system',       '2026-04-30 16:10:21.535239+00', NULL,                              NULL, true, false) ON CONFLICT (hol_id) DO NOTHING;

-- Sprint 1: Festivos faltantes de insert_holidays.sql (fusionados aquí; el archivo separado fue eliminado)

-- El Salvador 2025 — fechas no cubiertas en los IDs 27-37
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (57, 1, 'Año Nuevo',                    '2025-01-01', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (58, 1, 'Fiestas Agostinas (1)',        '2025-08-01', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (59, 1, 'Fiestas Agostinas (2)',        '2025-08-04', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (60, 1, 'Fiestas Agostinas (3)',        '2025-08-05', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (61, 1, 'Día de la Raza',               '2025-10-12', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;

-- El Salvador 2026 — fechas no cubiertas en los IDs 14-26
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (62, 1, 'Fiestas Agostinas (1)',        '2026-08-01', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (63, 1, 'Fiestas Agostinas (2)',        '2026-08-04', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (64, 1, 'Fiestas Agostinas (4)',        '2026-08-05', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (65, 1, 'Día del Padre',                '2026-06-21', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (66, 1, 'Día de la Raza',               '2026-10-12', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (67, 1, 'Día del Trabajo',              '2026-05-01', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (68, 1, 'Día de la Madre',              '2026-05-10', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;

-- Guatemala 2026 — año completo no presente en seed (solo 2026 IDs 1-13 que corresponden a inglés)
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (69, 2, 'Día del Ejército',             '2026-06-30', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (70, 2, 'Día del Trabajo',              '2026-05-01', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (71, 2, 'Año Nuevo',                    '2026-01-01', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;

-- México 2025 — año completo faltante en seed
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (72, 3, 'Año Nuevo',                    '2025-01-01', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (73, 3, 'Día de la Constitución',       '2025-02-03', false, NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (74, 3, 'Natalicio de Benito Juárez',   '2025-03-17', false, NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (75, 3, 'Jueves Santo',                 '2025-04-17', false, NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (76, 3, 'Viernes Santo',                '2025-04-18', false, NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (77, 3, 'Día del Trabajo',              '2025-05-01', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (78, 3, 'Día de la Independencia',      '2025-09-16', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (79, 3, 'Día de la Revolución',         '2025-11-17', false, NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (80, 3, 'Navidad',                      '2025-12-25', true,  NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;

-- México 2026 — Jueves/Viernes Santo faltantes (seed ya tenía IDs 50-56 pero sin Semana Santa)
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (81, 3, 'Jueves Santo',                 '2026-04-02', false, NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;
INSERT INTO ds.hol_holiday (hol_id, cou_id, hol_name, hol_date, hol_is_recurring, hol_created_at, hol_created_by, hol_updated_at, hol_is_active, hol_is_half_day) VALUES (82, 3, 'Viernes Santo',                '2026-04-03', false, NOW(), 'seed', NOW(), true, false) ON CONFLICT (hol_id) DO NOTHING;

-- Resetea la secuencia al mayor ID insertado para evitar colisiones en futuros inserts por aplicación
SELECT setval(pg_get_serial_sequence('ds.hol_holiday', 'hol_id'), GREATEST(MAX(hol_id), 82), true) FROM ds.hol_holiday;

-- ============================================================
-- DEV ONLY — Fictional team members for local development
-- All names, emails, phone numbers, and IDs below are entirely
-- made up and do not correspond to any real person.
-- WDIDs use the 10999xxx range to avoid clashing with real data.
-- ============================================================

-- 12. Fictional Workday info (es schema — transient; insert only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'es' AND table_name = 'win_workday_info') THEN
    INSERT INTO es.win_workday_info (win_wdid, win_hire_date, win_corporate_email, win_personal_email, win_all_emails, win_cellphone, win_home_phone, win_birth_date, win_parenthood, win_work_style, win_gender, win_billing_status, win_cost_center_hierarchy, win_cost_center_names, win_direct_manager, win_vacation, win_personal_days)
    VALUES
      ('10999001', '2021-03-15', 'laura.mendoza@telusinternational.com',   'laura.mendoza@example.com',   '{}', '+503 7000-0001', '+503 2200-0001', '1993-07-12', false, 'Remote',   'Female', 'Billable',     'Digital Services > Technology > Central America', 'TICA Digital Services',  'Pedro Sandoval (10998000)',  15.00, 3),
      ('10999002', '2020-06-01', 'carlos.herrera@telusinternational.com',  'carlos.herrera@example.com',  '{}', '+502 5000-0002', '+502 2300-0002', '1990-11-28', true,  'Onsite',   'Male',   'Billable',     'Digital Services > Technology > Central America', 'TICA Digital Services',  'Pedro Sandoval (10998000)',  15.00, 3),
      ('10999003', '2022-01-10', 'sofia.ruiz@telusinternational.com',      'sofia.ruiz@example.com',      '{}', '+52 55 1000-0003', NULL,            '1995-03-04', false, 'Remote',   'Female', 'Billable',     'Digital Services > Technology > Mexico',          'TICA Mexico',            'Ana Castellanos (10998001)', 12.00, 3),
      ('10999004', '2019-09-23', 'diego.castillo@telusinternational.com',  'diego.castillo@example.com',  '{}', '+503 7000-0004', '+503 2200-0004', '1988-05-17', true,  'Combined', 'Male',   'Billable',     'Digital Services > Technology > Central America', 'TICA Digital Services',  'Pedro Sandoval (10998000)',  15.00, 3),
      ('10999005', '2023-04-03', 'andrea.vega@telusinternational.com',     'andrea.vega@example.com',     '{}', '+502 5000-0005', NULL,             '1997-09-30', false, 'Remote',   'Female', 'Billable',     'Digital Services > Technology > Central America', 'TICA Digital Services',  'Pedro Sandoval (10998000)',  15.00, 3),
      ('10999006', '2021-11-08', 'roberto.flores@telusinternational.com',  'roberto.flores@example.com',  '{}', '+52 55 1000-0006', NULL,            '1991-01-22', false, 'Remote',   'Male',   'Billable',     'Digital Services > Technology > Mexico',          'TICA Mexico',            'Ana Castellanos (10998001)', 12.00, 3),
      ('10999007', '2020-02-14', 'valeria.mora@telusinternational.com',    'valeria.mora@example.com',    '{}', '+503 7000-0007', '+503 2200-0007', '1994-12-06', true,  'Onsite',   'Female', 'Billable',     'Digital Services > Technology > Central America', 'TICA Digital Services',  'Pedro Sandoval (10998000)',  15.00, 3),
      ('10999008', '2018-07-30', 'miguel.torres@telusinternational.com',   'miguel.torres@example.com',   '{}', '+502 5000-0008', '+502 2300-0008', '1986-08-19', true,  'Combined', 'Male',   'Non-Billable', 'Digital Services > Technology > Central America', 'TICA Digital Services',  'Pedro Sandoval (10998000)',  15.00, 3),
      ('10999009', '2022-08-22', 'claudia.espino@telusinternational.com',  'claudia.espino@example.com',  '{}', '+52 55 1000-0009', NULL,            '1996-04-11', false, 'Remote',   'Female', 'Billable',     'Digital Services > Technology > Mexico',          'TICA Mexico',            'Ana Castellanos (10998001)', 12.00, 3),
      ('10999010', '2017-05-05', 'fernando.reyes@telusinternational.com',  'fernando.reyes@example.com',  '{}', '+503 7000-0010', '+503 2200-0010', '1984-02-25', false, 'Onsite',   'Male',   'Billable',     'Digital Services > Technology > Central America', 'TICA Digital Services',  'Pedro Sandoval (10998000)',  15.00, 3)
    ON CONFLICT (win_wdid) DO NOTHING;
  END IF;
END $$;

-- 13. Fictional team members
INSERT INTO ds.tbl_team_members (tms_id, tms_names, tms_surnames, tms_known_as, tms_stadat, tms_enddat, cou_id, wdid, tms_seniority, tms_primary_role, tib_id, tms_created_by, tms_credat, tms_last_updated_by, tms_last_upddat, tms_full_legal_name, tms_xid, sft_id)
VALUES
  (500, 'Laura',    'Mendoza',  'Laura',    '2021-03-15', NULL, 1, '10999001', 'T3 Band 1', 17, 3, 1, '2021-03-15', NULL, NULL, NULL, NULL, 1),
  (501, 'Carlos',   'Herrera',  'Carlos',   '2020-06-01', NULL, 2, '10999002', 'T3 Band 2', 25, 4, 1, '2020-06-01', NULL, NULL, NULL, NULL, 1),
  (502, 'Sofia',    'Ruiz',     'Sofia',    '2022-01-10', NULL, 3, '10999003', 'T4 Band 1', 16, 5, 1, '2022-01-10', NULL, NULL, NULL, NULL, 1),
  (503, 'Diego',    'Castillo', 'Diego',    '2019-09-23', NULL, 1, '10999004', 'T3 Band 1',  4, 3, 1, '2019-09-23', NULL, NULL, NULL, NULL, 1),
  (504, 'Andrea',   'Vega',     'Andrea',   '2023-04-03', NULL, 2, '10999005', 'T4 Band 2', 10, 6, 1, '2023-04-03', NULL, NULL, NULL, NULL, 1),
  (505, 'Roberto',  'Flores',   'Roberto',  '2021-11-08', NULL, 3, '10999006', 'T4 Band 1', 13, 5, 1, '2021-11-08', NULL, NULL, NULL, NULL, 1),
  (506, 'Valeria',  'Mora',     'Valeria',  '2020-02-14', NULL, 1, '10999007', 'T3 Band 2', 24, 4, 1, '2020-02-14', NULL, NULL, NULL, NULL, 1),
  (507, 'Miguel',   'Torres',   'Miguel',   '2018-07-30', NULL, 2, '10999008', 'T5 Band 1', 23, 7, 1, '2018-07-30', NULL, NULL, NULL, NULL, 1),
  (508, 'Claudia',  'Espino',   'Claudia',  '2022-08-22', NULL, 3, '10999009', 'T4 Band 1',  6, 5, 1, '2022-08-22', NULL, NULL, NULL, NULL, 1),
  (509, 'Fernando', 'Reyes',    'Fernando', '2017-05-05', NULL, 1, '10999010', 'T5 Band 2', 30, 8, 1, '2017-05-05', NULL, NULL, NULL, NULL, 1)
ON CONFLICT (tms_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('ds.tbl_team_members', 'tms_id'), GREATEST((SELECT MAX(tms_id) FROM ds.tbl_team_members), 509));

-- 14. Dev Projects
INSERT INTO ds.pro_projects (pro_id, pro_name, pro_external_id, pro_sow, pro_start_date, pro_end_date, pro_active, pro_created_at, pro_created_by, tms_id_pm)
VALUES
  (100, 'Digital Transformation Initiative', 'EXT-2024-001', 'SOW-2024-001', '2024-01-01', NULL,         true, CURRENT_DATE, 'dev.user@telusinternational.com', 507),
  (101, 'Cloud Migration Program',           'EXT-2024-002', 'SOW-2024-002', '2024-03-01', NULL,         true, CURRENT_DATE, 'dev.user@telusinternational.com', 509),
  (102, 'Customer Portal Redesign',          'EXT-2024-003', 'SOW-2024-003', '2024-06-01', '2025-12-31', true, CURRENT_DATE, 'dev.user@telusinternational.com', 507),
  (103, 'Data Analytics Platform',           'EXT-2025-001', 'SOW-2025-001', '2025-01-15', NULL,         true, CURRENT_DATE, 'dev.user@telusinternational.com', 501),
  (104, 'Mobile App Modernization',          'EXT-2025-002', 'SOW-2025-002', '2025-04-01', NULL,         true, CURRENT_DATE, 'dev.user@telusinternational.com', 503)
ON CONFLICT (pro_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.pro_projects', 'pro_id'), GREATEST((SELECT MAX(pro_id) FROM ds.pro_projects), 104));

-- 15. Dev Project Assignments (one per project)
INSERT INTO ds.tmp_team_member_project (tmp_id, tms_id, pro_id, tmp_start_date, tmp_end_date, tmp_bill_rate, tmp_bill_rate_currency, tmp_created_by, tmp_allocation, tmp_deleted, sft_id)
VALUES
  (100, 500, 100, '2024-01-01', NULL,         75.00, 'USD', 1, 100.00, false, 1),
  (101, 501, 101, '2024-03-01', NULL,         80.00, 'USD', 1, 100.00, false, 1),
  (102, 502, 102, '2024-06-01', '2025-12-31', 70.00, 'USD', 1, 100.00, false, 1),
  (103, 503, 103, '2025-01-15', NULL,         85.00, 'USD', 1, 100.00, false, 1),
  (104, 504, 104, '2025-04-01', NULL,         72.00, 'USD', 1, 100.00, false, 1)
ON CONFLICT (tmp_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.tmp_team_member_project', 'tmp_id'), GREATEST((SELECT MAX(tmp_id) FROM ds.tmp_team_member_project), 104));

-- 16. Corporate Phone Lines
INSERT INTO ds.cpl_corporate_phone_lines (cpl_id, cpl_phone_number, cpl_contract_start_date, cpl_contract_end_date, cpl_renewal_parent_id, cpl_actual_cost_rate, cpl_deleted_at, cou_id, cpl_created_at, usr_id_created_by, usr_id_updated_by, cpl_comments, cpl_deleted)
VALUES
  (1, '50378537348', NULL, NULL, NULL, 22.51, NULL, 1, NOW(), 1, NULL, 'Line currently being charged to Mastercard Prepaid Management Services', false),
  (2, '50378603601', NULL, NULL, NULL, 22.52, NULL, 1, NOW(), 1, NULL, 'Line currently being charged to Mastercard Prepaid Management Services', false),
  (3, '50378604304', NULL, NULL, NULL, 22.52, NULL, 1, NOW(), 1, NULL, 'Line currently being charged to Mastercard Prepaid Management Services', false)
ON CONFLICT (cpl_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.cpl_corporate_phone_lines', 'cpl_id'), GREATEST((SELECT MAX(cpl_id) FROM ds.cpl_corporate_phone_lines), 3));

-- Sprint 2: Clientes (cli_clients)
-- Derivado de schema.prisma — Client: cli_id (PK), cli_name (Text)
INSERT INTO ds.cli_clients (cli_id, cli_name) VALUES (1, 'TELUS International')    ON CONFLICT (cli_id) DO NOTHING;
INSERT INTO ds.cli_clients (cli_id, cli_name) VALUES (2, 'Mastercard')              ON CONFLICT (cli_id) DO NOTHING;
INSERT INTO ds.cli_clients (cli_id, cli_name) VALUES (3, 'Charter Communications')  ON CONFLICT (cli_id) DO NOTHING;
INSERT INTO ds.cli_clients (cli_id, cli_name) VALUES (4, 'Dolby Labs')              ON CONFLICT (cli_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.cli_clients', 'cli_id'), GREATEST(MAX(cli_id), 4), true) FROM ds.cli_clients;

-- Sprint 3: Áreas funcionales (far_functional_areas)
-- Schema: far_id (PK), far_name (Text), cou_id (FK nullable)
-- SV=1, GT=2, MX=3
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (1,  'Ingeniería',        1) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (2,  'QA',                1) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (3,  'DevOps',            1) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (4,  'Scrum Master',      1) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (5,  'Arquitectura',      1) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (6,  'Ingeniería',        2) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (7,  'QA',                2) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (8,  'DevOps',            2) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (9,  'Scrum Master',      2) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (10, 'Arquitectura',      2) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (11, 'Ingeniería',        3) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (12, 'QA',                3) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (13, 'DevOps',            3) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (14, 'Scrum Master',      3) ON CONFLICT (far_id) DO NOTHING;
INSERT INTO ds.far_functional_areas (far_id, far_name, cou_id) VALUES (15, 'Arquitectura',      3) ON CONFLICT (far_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.far_functional_areas', 'far_id'), GREATEST(MAX(far_id), 15), true) FROM ds.far_functional_areas;

-- Sprint 3: Categorías de bono (bca_bonus_categories)
-- Schema: bca_id (PK), bca_name (Text UNIQUE)
INSERT INTO ds.bca_bonus_categories (bca_id, bca_name) VALUES (1, 'Referido')    ON CONFLICT (bca_id) DO NOTHING;
INSERT INTO ds.bca_bonus_categories (bca_id, bca_name) VALUES (2, 'Desempeño')   ON CONFLICT (bca_id) DO NOTHING;
INSERT INTO ds.bca_bonus_categories (bca_id, bca_name) VALUES (3, 'Firma')       ON CONFLICT (bca_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.bca_bonus_categories', 'bca_id'), GREATEST(MAX(bca_id), 3), true) FROM ds.bca_bonus_categories;

-- Sprint 3: Subcategorías de bono (bsc_bonus_subcategories)
-- Schema: bsc_id (PK), bca_id (FK), bsc_name (Text), cou_id (FK)
-- Unique constraint: (bca_id, cou_id, bsc_name)
INSERT INTO ds.bsc_bonus_subcategories (bsc_id, bca_id, bsc_name, cou_id, bsc_metadata) VALUES (1,  1, 'Referido Externo',    1, '{}') ON CONFLICT (bsc_id) DO NOTHING;
INSERT INTO ds.bsc_bonus_subcategories (bsc_id, bca_id, bsc_name, cou_id, bsc_metadata) VALUES (2,  1, 'Referido Interno',    1, '{}') ON CONFLICT (bsc_id) DO NOTHING;
INSERT INTO ds.bsc_bonus_subcategories (bsc_id, bca_id, bsc_name, cou_id, bsc_metadata) VALUES (3,  2, 'Bono Anual',          1, '{}') ON CONFLICT (bsc_id) DO NOTHING;
INSERT INTO ds.bsc_bonus_subcategories (bsc_id, bca_id, bsc_name, cou_id, bsc_metadata) VALUES (4,  3, 'Firma Estándar',      1, '{}') ON CONFLICT (bsc_id) DO NOTHING;
INSERT INTO ds.bsc_bonus_subcategories (bsc_id, bca_id, bsc_name, cou_id, bsc_metadata) VALUES (5,  1, 'Referido Externo',    2, '{}') ON CONFLICT (bsc_id) DO NOTHING;
INSERT INTO ds.bsc_bonus_subcategories (bsc_id, bca_id, bsc_name, cou_id, bsc_metadata) VALUES (6,  2, 'Bono Anual',          2, '{}') ON CONFLICT (bsc_id) DO NOTHING;
INSERT INTO ds.bsc_bonus_subcategories (bsc_id, bca_id, bsc_name, cou_id, bsc_metadata) VALUES (7,  3, 'Firma Estándar',      2, '{}') ON CONFLICT (bsc_id) DO NOTHING;
INSERT INTO ds.bsc_bonus_subcategories (bsc_id, bca_id, bsc_name, cou_id, bsc_metadata) VALUES (8,  1, 'Referido Externo',    3, '{}') ON CONFLICT (bsc_id) DO NOTHING;
INSERT INTO ds.bsc_bonus_subcategories (bsc_id, bca_id, bsc_name, cou_id, bsc_metadata) VALUES (9,  2, 'Bono Anual',          3, '{}') ON CONFLICT (bsc_id) DO NOTHING;
INSERT INTO ds.bsc_bonus_subcategories (bsc_id, bca_id, bsc_name, cou_id, bsc_metadata) VALUES (10, 3, 'Firma Estándar',      3, '{}') ON CONFLICT (bsc_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.bsc_bonus_subcategories', 'bsc_id'), GREATEST(MAX(bsc_id), 10), true) FROM ds.bsc_bonus_subcategories;

-- Sprint 4: Categorías de notificación (com.cat_categories)
-- Schema: cat_id (PK), cat_name (VarChar 100), cat_color (VarChar 50 nullable)
INSERT INTO com.cat_categories (cat_id, cat_name, cat_color) VALUES (1, 'Tiempo Libre',          'blue')   ON CONFLICT (cat_id) DO NOTHING;
INSERT INTO com.cat_categories (cat_id, cat_name, cat_color) VALUES (2, 'Endosos',               'green')  ON CONFLICT (cat_id) DO NOTHING;
INSERT INTO com.cat_categories (cat_id, cat_name, cat_color) VALUES (3, 'Contratación',          'purple') ON CONFLICT (cat_id) DO NOTHING;
INSERT INTO com.cat_categories (cat_id, cat_name, cat_color) VALUES (4, 'Sistema',               'gray')   ON CONFLICT (cat_id) DO NOTHING;
INSERT INTO com.cat_categories (cat_id, cat_name, cat_color) VALUES (5, 'Intercambio de Días',   'orange') ON CONFLICT (cat_id) DO NOTHING;
INSERT INTO com.cat_categories (cat_id, cat_name, cat_color) VALUES (6, 'Inbox',                 'teal')   ON CONFLICT (cat_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('com.cat_categories', 'cat_id'), GREATEST(MAX(cat_id), 6), true) FROM com.cat_categories;

-- Sprint 4: Nuevas opciones RBAC (módulos agregados después de opt_id 52)
-- GiftCards, TopPerformers, Uploads, ClientContacts, BonusSubcategories
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (53, 'GiftCards',          'system', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (54, 'TopPerformers',      'system', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (55, 'Uploads',            'system', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (56, 'ClientContacts',     'system', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (57, 'BonusSubcategories', 'system', NOW()) ON CONFLICT (opt_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('sec.opt_options', 'opt_id'), GREATEST(MAX(opt_id), 57), true) FROM sec.opt_options;

-- Sprint 4: Permisos admin (rol_id=1) para los nuevos módulos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'GiftCards'          AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('GiftCards',          true, true, true,  NULL, NOW(), 53, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'TopPerformers'      AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TopPerformers',      true, true, true,  NULL, NOW(), 54, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Uploads'            AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Uploads',            true, true, true,  NULL, NOW(), 55, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'ClientContacts'     AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('ClientContacts',     true, true, true,  NULL, NOW(), 56, 1); END IF;
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'BonusSubcategories' AND rol_id = 1) THEN INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('BonusSubcategories', true, true, true,  NULL, NOW(), 57, 1); END IF;
END $$;

-- Sprint 6: Catálogo de Gift Cards
-- Pools (tbl_gcp_pools) — gcp_code es UNIQUE; gcp_id es PK
INSERT INTO ds.tbl_gcp_pools (gcp_id, gcp_code, gcp_name, gcp_is_active, gcp_created_by) VALUES (1, 'POOL-Q1-2025', 'Pool Q1 2025', true, 1) ON CONFLICT (gcp_id) DO NOTHING;
INSERT INTO ds.tbl_gcp_pools (gcp_id, gcp_code, gcp_name, gcp_is_active, gcp_created_by) VALUES (2, 'POOL-Q2-2025', 'Pool Q2 2025', true, 1) ON CONFLICT (gcp_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.tbl_gcp_pools', 'gcp_id'), GREATEST(MAX(gcp_id), 2), true) FROM ds.tbl_gcp_pools;

-- Reasons (tbl_gcr_reasons) — gcr_name es UNIQUE
INSERT INTO ds.tbl_gcr_reasons (gcr_id, gcr_name, gcr_is_active, gcr_created_by) VALUES (1, 'Aniversario',    true, 1) ON CONFLICT (gcr_id) DO NOTHING;
INSERT INTO ds.tbl_gcr_reasons (gcr_id, gcr_name, gcr_is_active, gcr_created_by) VALUES (2, 'Desempeño',      true, 1) ON CONFLICT (gcr_id) DO NOTHING;
INSERT INTO ds.tbl_gcr_reasons (gcr_id, gcr_name, gcr_is_active, gcr_created_by) VALUES (3, 'Reconocimiento', true, 1) ON CONFLICT (gcr_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.tbl_gcr_reasons', 'gcr_id'), GREATEST(MAX(gcr_id), 3), true) FROM ds.tbl_gcr_reasons;

-- Card Types (tbl_gct_card_types) — gct_name es UNIQUE
INSERT INTO ds.tbl_gct_card_types (gct_id, gct_name, gct_is_active, gct_created_by) VALUES (1, 'Amazon',    true, 1) ON CONFLICT (gct_id) DO NOTHING;
INSERT INTO ds.tbl_gct_card_types (gct_id, gct_name, gct_is_active, gct_created_by) VALUES (2, 'Netflix',   true, 1) ON CONFLICT (gct_id) DO NOTHING;
INSERT INTO ds.tbl_gct_card_types (gct_id, gct_name, gct_is_active, gct_created_by) VALUES (3, 'Uber Eats', true, 1) ON CONFLICT (gct_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.tbl_gct_card_types', 'gct_id'), GREATEST(MAX(gct_id), 3), true) FROM ds.tbl_gct_card_types;

-- Card Values (tbl_gcv_card_values) — sin unique natural, usa gcp_id como guard
INSERT INTO ds.tbl_gcv_card_values (gcv_id, gct_id, gcv_amount, gcv_currency, gcv_is_active, gcv_created_by) VALUES (1, 1, 25.00, 'USD', true, 1) ON CONFLICT (gcv_id) DO NOTHING;
INSERT INTO ds.tbl_gcv_card_values (gcv_id, gct_id, gcv_amount, gcv_currency, gcv_is_active, gcv_created_by) VALUES (2, 1, 50.00, 'USD', true, 1) ON CONFLICT (gcv_id) DO NOTHING;
INSERT INTO ds.tbl_gcv_card_values (gcv_id, gct_id, gcv_amount, gcv_currency, gcv_is_active, gcv_created_by) VALUES (3, 2, 25.00, 'USD', true, 1) ON CONFLICT (gcv_id) DO NOTHING;
INSERT INTO ds.tbl_gcv_card_values (gcv_id, gct_id, gcv_amount, gcv_currency, gcv_is_active, gcv_created_by) VALUES (4, 2, 50.00, 'USD', true, 1) ON CONFLICT (gcv_id) DO NOTHING;
INSERT INTO ds.tbl_gcv_card_values (gcv_id, gct_id, gcv_amount, gcv_currency, gcv_is_active, gcv_created_by) VALUES (5, 3, 25.00, 'USD', true, 1) ON CONFLICT (gcv_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('ds.tbl_gcv_card_values', 'gcv_id'), GREATEST(MAX(gcv_id), 5), true) FROM ds.tbl_gcv_card_values;

-- Sprint 6: Contactos de cliente (cco_client_contact)
-- Schema: cco_id (PK), cli_id (FK), cco_name, cco_email, cco_phone_number, cco_position, cco_active
-- Depende de cli_clients (Sprint 2) — un contacto por cliente
INSERT INTO ds.cco_client_contact (cco_id, cli_id, cco_name, cco_email, cco_phone_number, cco_position, cco_active)
VALUES (1, 1, 'TELUS Contact',   'contact@telusinternational.com', '+1-800-000-0001', 'Account Manager', true)
ON CONFLICT (cco_id) DO NOTHING;

INSERT INTO ds.cco_client_contact (cco_id, cli_id, cco_name, cco_email, cco_phone_number, cco_position, cco_active)
VALUES (2, 2, 'Mastercard Contact', 'contact@mastercard.com', '+1-800-000-0002', 'Account Manager', true)
ON CONFLICT (cco_id) DO NOTHING;

INSERT INTO ds.cco_client_contact (cco_id, cli_id, cco_name, cco_email, cco_phone_number, cco_position, cco_active)
VALUES (3, 3, 'Charter Contact', 'contact@charter.com', '+1-800-000-0003', 'Account Manager', true)
ON CONFLICT (cco_id) DO NOTHING;

INSERT INTO ds.cco_client_contact (cco_id, cli_id, cco_name, cco_email, cco_phone_number, cco_position, cco_active)
VALUES (4, 4, 'Dolby Contact',   'contact@dolby.com', '+1-800-000-0004', 'Account Manager', true)
ON CONFLICT (cco_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('ds.cco_client_contact', 'cco_id'), GREATEST(MAX(cco_id), 4), true) FROM ds.cco_client_contact;

-- 17. Corporate Phone Assignments
-- Guard: solo inserta si el TM existe (los TMs reales se cargan en un paso posterior al seed.sql)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 61)
  AND NOT EXISTS (SELECT 1 FROM ds.cpa_corporate_phone_assignments WHERE cpa_id = 1) THEN
    INSERT INTO ds.cpa_corporate_phone_assignments (cpa_id, cpl_id, tms_id, cpa_bill_rate, cpa_assign_date_start, cpa_assign_date_end, cpa_billable, cpa_remarks, cpa_created_at, usr_id_created_by, usr_id_updated_by, cpa_deleted_at, cpa_deleted)
    VALUES (1, 1, 61, 25.00, '2026-01-01', NULL, true, 'Initial migration, assigning starting 1 Jan 2026 to Ernesto Menjívar Colorado (10083492)', NOW(), 1, NULL, NULL, false);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 87)
  AND NOT EXISTS (SELECT 1 FROM ds.cpa_corporate_phone_assignments WHERE cpa_id = 2) THEN
    INSERT INTO ds.cpa_corporate_phone_assignments (cpa_id, cpl_id, tms_id, cpa_bill_rate, cpa_assign_date_start, cpa_assign_date_end, cpa_billable, cpa_remarks, cpa_created_at, usr_id_created_by, usr_id_updated_by, cpa_deleted_at, cpa_deleted)
    VALUES (2, 2, 87, 25.00, '2026-01-01', NULL, true, 'Initial migration, assigning starting 1 Jan 2026 to Roberto Pineda Urrutia (10029794)', NOW(), 1, NULL, NULL, false);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 5)
  AND NOT EXISTS (SELECT 1 FROM ds.cpa_corporate_phone_assignments WHERE cpa_id = 3) THEN
    INSERT INTO ds.cpa_corporate_phone_assignments (cpa_id, cpl_id, tms_id, cpa_bill_rate, cpa_assign_date_start, cpa_assign_date_end, cpa_billable, cpa_remarks, cpa_created_at, usr_id_created_by, usr_id_updated_by, cpa_deleted_at, cpa_deleted)
    VALUES (3, 3, 5, 25.00, '2026-01-01', NULL, true, 'Initial migration, assigning starting 1 Jan 2026 to Josue Guillen Rosales (10100154)', NOW(), 1, NULL, NULL, false);
  END IF;
END $$;
SELECT setval(pg_get_serial_sequence('ds.cpa_corporate_phone_assignments', 'cpa_id'), GREATEST((SELECT COALESCE(MAX(cpa_id), 0) FROM ds.cpa_corporate_phone_assignments), 3));

-- 18. Fictional Fieldglass SOWs

INSERT INTO ds.fgs_fieldglass_sows (
  fgs_sow_name, fgs_sow_id, fgs_sow_owner, fgs_backup_sow_owner,
  fgs_tdx_sow_creators_primary, fgs_tdx_sow_creators_delegate,
  fgs_tdx_ta_prime_primary, fgs_tdx_ta_prime_delegate,
  fgs_tdx_profile_worker_creators_primary, fgs_tdx_profile_worker_creators_delegate,
  fgs_created_by
)
VALUES
  ('CFO VP Marisol Delgado - TDx T&M',   'TLS1TQ00999001', 'Marisol Delgado', 'Tobias Renner',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield', 1),

  ('COO Director Felix Okafor - TDx T&M', 'TLS1TQ00999002', 'Felix Okafor', NULL,
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield', 1),

  ('CTO Manager Ingrid Solberg - TDx SOW', 'TLS1TQ00999003', 'Ingrid Solberg', 'Derek Voss',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield', 1),

  ('VP Sales Naomi Castillo - TDx T&M',   'TLS1TQ00999004', 'Naomi Castillo', 'Grace Lindqvist',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield', 1),

  ('SVP Ops Lucas Ferreira - TDx T&M',    'TLS1TQ00999005', 'Lucas Ferreira', NULL,
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield',
   'Priya Anand', 'Marcus Webb, Elena Ruiz, Sam Whitfield', 1)
ON CONFLICT (fgs_sow_id) DO NOTHING;

-- 19. Persistence Template: Entity Snapshot (Land Test)
-- Direct-DB insert for the change-detection platform Land stage
WITH new_template AS (
    INSERT INTO di.pte_persistence_templates (
        pte_id, pte_name, pte_description, pte_enabled, pte_has_csv_header,
        pte_separator, pte_truncate_before_import, pte_error_handling_strategy,
        pte_duplicates_handling_strategy, pte_target_table, pte_created_by, pte_created_at
    )
    -- Aggregate in a subquery: at top level it returns a row even when WHERE filters
    -- everything out, which made every re-seed fail here (silently — setup uses || true).
    SELECT
        m.next_id,
        'Entity Snapshot (Land Test)',
        'Change-detection platform Land-stage table. jsonb payload column — source files must be RFC-4180-quoted on the payload field (JSON is quote-dense; required even with Tab separator, confirmed 2026-09-18). snp_id (identity PK) left unmapped, append-only through this template.',
        true,
        true,
        E'\t',
        true,
        'STOP_ON_FIRST_ERROR_AND_ROLLBACK',
        'INSERT',
        'es.snp_entity_snapshot',
        'milton.ayala2@telusdigital.com',
        now()
    FROM (SELECT COALESCE(MAX(pte_id), 0) + 1 AS next_id FROM di.pte_persistence_templates) m
    WHERE NOT EXISTS (SELECT 1 FROM di.pte_persistence_templates WHERE pte_target_table = 'es.snp_entity_snapshot')
    RETURNING pte_id
)
INSERT INTO di.ptc_persistence_template_columns (
    pte_id, ptc_index, ptc_name, ptc_type, ptc_length, ptc_allow_null, ptc_comment,
    ptc_csv_column_name, ptc_csv_column_index
)
SELECT nt.pte_id, v.*
FROM new_template nt
CROSS JOIN (VALUES
    (0, 'snp_entity_type',  'text',   NULL::int, false, NULL::text, 'entity_type', -1),
    (1, 'snp_entity_id',    'text',   NULL::int, false, NULL::text, 'entity_id',   -1),
    (2, 'snp_payload',      'jsonb',  NULL::int, false, NULL::text, 'payload',     -1)
) AS v(ptc_index, ptc_name, ptc_type, ptc_length, ptc_allow_null, ptc_comment, ptc_csv_column_name, ptc_csv_column_index)
ON CONFLICT DO NOTHING;

-- 20–21. Watched entities, watched fields and approved-state baselines are NOT seeded
-- (removed 2026-09-25) — change detection starts blank, as in production. Configure the
-- entity and fields in Object & Field Manager, then load a baseline; see
-- docs/technical/change-detection-production-deployment.md.

-- Findings — Change Detection Platform (added 2026-09-18)
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at)
  VALUES (58, 'Findings', 'milton.ayala2@telusdigital.com', now()) ON CONFLICT (opt_id) DO NOTHING;

DO $$
BEGIN
  -- admin (rol_id=1)
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Findings' AND rol_id = 1) THEN
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id)
      VALUES ('Findings', true, true, true, NULL, NOW(), 58, 1);
  END IF;
  -- user (rol_id=2)
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'Findings' AND rol_id = 2) THEN
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id)
      VALUES ('Findings', true, true, true, NULL, NOW(), 58, 2);
  END IF;
END $$;

-- Open-finding dedup guarantee (Prisma schema DSL cannot express partial indexes).
-- Keyed on the columns, not the fingerprint: the fingerprint embeds new_value, so it
-- changes when the drifted value changes and cannot enforce one open finding per field.
-- rul_id separates state-rule findings from change findings (always NULL rul_id) so the
-- two engines never collide on the same field.
-- 'acknowledged' is live too (Findings Review Workflow), so it recurs instead of duplicating.
-- Mirrored from prisma/scripts/findings_review_workflow.sql.
DROP INDEX IF EXISTS ds.uq_fnd_open_fingerprint;
DROP INDEX IF EXISTS ds.uq_fnd_open_entity_field;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fnd_open_entity_field
    ON ds.fnd_findings (cde_entity_type, fnd_entity_id, cdf_field_path, rul_id)
    NULLS NOT DISTINCT
    WHERE status IN ('open', 'acknowledged');

-- State detection rules are NOT seeded (removed 2026-09-25) — create them on the
-- Detection Rules screen.

-- ds.fn_run_state_rules() — called by POST /api/findings/run-rules.
-- Mirrored from prisma/scripts/fn_run_state_rules.sql (taken from pg_get_functiondef).
-- Its ON CONFLICT target must match uq_fnd_open_entity_field above.
CREATE OR REPLACE FUNCTION ds.fn_run_state_rules()
 RETURNS TABLE(entity_id text, field text, rule_type text, current_value text, finding_action text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    r RECORD;
    s RECORD;
    v_field      text;
    v_min        numeric;
    v_max        numeric;
    v_expected   boolean;
    v_value      text;
    v_violated   boolean;
    v_fingerprint text;
    v_new_status  text;
    v_when_value  text;
    v_when_match  boolean;
BEGIN
    FOR r IN
        SELECT rul_id, cde_entity_type, rul_type, rul_definition, rul_severity, rul_version
        FROM ds.rul_detection_rules
        WHERE rul_class = 'state' AND rul_active = true
    LOOP
        v_field := r.rul_definition ->> 'field';

        FOR s IN
            SELECT snp_entity_id, snp_payload
            FROM es.snp_entity_snapshot
            WHERE snp_entity_type = r.cde_entity_type
        LOOP
            v_value    := s.snp_payload ->> v_field;
            v_violated := false;

            IF r.rul_type = 'required_not_null' THEN
                v_violated := (v_value IS NULL OR v_value = '');

            ELSIF r.rul_type = 'required_empty' THEN
                v_violated := (v_value IS NOT NULL AND v_value <> '');

            ELSIF r.rul_type = 'range_check' THEN
                v_min := (r.rul_definition ->> 'min')::numeric;
                v_max := (r.rul_definition ->> 'max')::numeric;
                IF v_value IS NOT NULL AND v_value <> '' THEN
                    v_violated := (v_value::numeric < v_min OR v_value::numeric > v_max);
                END IF;
                -- a missing value doesn't trip a range check — nothing to compare.
                -- required_not_null is the rule that should own "must be filled."

            ELSIF r.rul_type = 'boolean_equals' THEN
                v_expected := (r.rul_definition ->> 'expected')::boolean;
                IF v_value IS NOT NULL AND v_value <> '' THEN
                    v_violated := (v_value::boolean IS DISTINCT FROM v_expected);
                ELSE
                    v_violated := true; -- missing on a must-equal check counts as a violation
                END IF;

            ELSIF r.rul_type = 'required_when' THEN
                v_when_value := s.snp_payload ->> (r.rul_definition #>> '{when,field}');
                v_when_match := CASE r.rul_definition #>> '{when,operator}'
                    WHEN 'equals'      THEN v_when_value = (r.rul_definition #>> '{when,value}')
                    WHEN 'contains'    THEN strpos(v_when_value, r.rul_definition #>> '{when,value}') > 0
                    WHEN 'starts_with' THEN starts_with(v_when_value, r.rul_definition #>> '{when,value}')
                    ELSE false
                END;
                -- NULL condition value → NULL match → not violated.
                v_violated := coalesce(v_when_match, false) AND (v_value IS NULL OR v_value = '');
            END IF;

            IF v_violated THEN
                v_fingerprint := r.cde_entity_type || ':' || s.snp_entity_id || ':rule:' || r.rul_id;

                INSERT INTO ds.fnd_findings
                    (fnd_fingerprint, cde_entity_type, fnd_entity_id, cdf_field_path,
                     rul_id, rul_version, change_type, new_value, severity, status)
                VALUES
                    (v_fingerprint, r.cde_entity_type, s.snp_entity_id, v_field,
                     r.rul_id, r.rul_version, NULL, to_jsonb(v_value), r.rul_severity, 'open')
                ON CONFLICT (cde_entity_type, fnd_entity_id, cdf_field_path, rul_id) WHERE status IN ('open', 'acknowledged')
                DO UPDATE SET last_seen = now(), occurrence_count = fnd_findings.occurrence_count + 1;

                -- Explicit casts: rul_type is varchar(100) and RETURN QUERY requires exact types.
                RETURN QUERY SELECT s.snp_entity_id::text, v_field, r.rul_type::text, v_value, 'finding opened/updated'::text;
            ELSE
                -- An acknowledged finding keeps the reviewer's comment in resolution.
                UPDATE ds.fnd_findings
                   SET status      = CASE WHEN status = 'acknowledged' THEN 'resolved_confirmed' ELSE 'self_resolved' END,
                       resolved_at = now(),
                       resolution  = CASE WHEN status = 'acknowledged' THEN resolution ELSE 'auto: rule no longer violated' END
                 WHERE cde_entity_type = r.cde_entity_type
                   AND fnd_entity_id   = s.snp_entity_id
                   AND cdf_field_path  = v_field
                   AND rul_id          = r.rul_id
                   AND status IN ('open', 'acknowledged')
                RETURNING status INTO v_new_status;

                IF FOUND THEN
                    RETURN QUERY SELECT s.snp_entity_id::text, v_field, r.rul_type::text, v_value,
                        CASE WHEN v_new_status = 'resolved_confirmed' THEN 'finding resolved-confirmed' ELSE 'finding self-resolved' END;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$function$;

-- Workflow engine primitives — LOCAL COPY ONLY (added 2026-09-25). Production already has
-- these; they belong to the workflow engine's owners and are never part of a feature
-- deployment. Mirrored verbatim from prisma/scripts/workflow_engine_primitives.sql (captured
-- from production) so a local rebuild can run the review workflow end to end.
CREATE OR REPLACE FUNCTION com.sp_notify_user(p_user_id integer, p_item_type text, p_payload jsonb, p_category_name text DEFAULT NULL::text, p_action_type text DEFAULT 'actionable'::text, p_created_by text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_ntf_id integer;
  v_cat_id integer;
BEGIN
  IF p_category_name IS NOT NULL THEN
    SELECT cat_id INTO v_cat_id FROM com.cat_categories WHERE cat_name = p_category_name;
  END IF;

  INSERT INTO com.ntf_notifications (cat_id, ntf_item_type, ntf_payload, ntf_created_by)
  VALUES (v_cat_id, p_item_type, p_payload, p_created_by)
  RETURNING ntf_id INTO v_ntf_id;

  INSERT INTO com.rec_recipients (ntf_id, usr_id, rec_action_type)
  VALUES (v_ntf_id, p_user_id, p_action_type);

  RETURN v_ntf_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION ds.sp_engine_complete_instance_if_done(p_win_id uuid, p_wit_id uuid, p_route_found boolean, p_performed_by text, p_performed_by_user_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_remaining        integer;
  v_state            text;
  v_retry_count      integer;
  v_max_retry_count  integer;
  v_instance_failed  boolean;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM ds.wit_workflow_instance_tasks
  WHERE win_id = p_win_id AND wit_state IN ('ACTIVE', 'PENDING');

  IF v_remaining > 0 THEN
    RETURN;
  END IF;

  SELECT wit_state, wit_retry_count, wit_max_retry_count
  INTO v_state, v_retry_count, v_max_retry_count
  FROM ds.wit_workflow_instance_tasks
  WHERE wit_id = p_wit_id;

  v_instance_failed := (v_state = 'FAILED' AND NOT p_route_found AND v_retry_count >= v_max_retry_count);

  UPDATE ds.win_workflow_instances
  SET win_status      = CASE WHEN v_instance_failed THEN 'FAILED' ELSE 'COMPLETED' END,
      win_completed_at = now(),
      win_completed_by = p_performed_by
  WHERE win_id = p_win_id;

  INSERT INTO ds.wal_workflow_audit_log (
    wal_id, win_id, wal_event_type, wal_event_timestamp, wal_performed_by, wal_new_state
  ) VALUES (
    gen_random_uuid(), p_win_id,
    CASE WHEN v_instance_failed THEN 'INSTANCE_FAILED' ELSE 'INSTANCE_COMPLETED' END,
    now(), p_performed_by,
    CASE WHEN v_instance_failed THEN 'FAILED' ELSE 'COMPLETED' END
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION ds.sp_engine_create_instance(p_wfl_id uuid, p_business_reference_type text, p_business_reference_id text, p_owner_user_id integer, p_started_by text, p_created_by text, p_context jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_win_id         uuid;
  v_wfl_code       varchar(30);
  v_wfl_version_no integer;
BEGIN
  SELECT wfl_code, wfl_version_no INTO v_wfl_code, v_wfl_version_no
  FROM ds.wfl_workflow_templates
  WHERE wfl_id = p_wfl_id AND wfl_status = 'PUBLISHED';

  IF v_wfl_code IS NULL THEN
    RAISE EXCEPTION 'sp_engine_create_instance: template % is not PUBLISHED', p_wfl_id;
  END IF;

  INSERT INTO ds.win_workflow_instances (
    win_id, wfl_id, win_workflow_code, win_template_version_no, win_name,
    win_status, win_started_at, win_started_by, win_owner_user_id,
    win_business_reference_type, win_business_reference_id, win_context_json,
    created_at, created_by
  ) VALUES (
    gen_random_uuid(), p_wfl_id, v_wfl_code, v_wfl_version_no,
    format('%s instance', v_wfl_code),
    'ACTIVE', now(), p_started_by, p_owner_user_id,
    p_business_reference_type, p_business_reference_id, p_context,
    now(), p_created_by
  )
  RETURNING win_id INTO v_win_id;

  IF p_context IS NOT NULL THEN
    INSERT INTO ds.wic_workflow_instance_context (
      wic_id, win_id, wic_key, wic_value_text, created_at, created_by
    )
    SELECT gen_random_uuid(), v_win_id, elem->>'key', elem->>'value', now(), p_created_by
    FROM jsonb_array_elements(p_context) elem;
  END IF;

  INSERT INTO ds.wal_workflow_audit_log (
    wal_id, win_id, wal_event_type, wal_event_timestamp, wal_performed_by, wal_new_state
  ) VALUES (
    gen_random_uuid(), v_win_id, 'INSTANCE_STARTED', now(), p_started_by, 'ACTIVE'
  );

  RETURN v_win_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION ds.sp_engine_insert_task(p_win_id uuid, p_wtk_code character varying, p_assignee_user_id integer, p_performed_by text, p_created_by text)
 RETURNS TABLE(activated_wit_id uuid, activated_user_id integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_wit_id uuid;
  v_wtk    RECORD;
BEGIN
  SELECT wtk.* INTO v_wtk
  FROM ds.wtk_workflow_template_tasks wtk
  JOIN ds.win_workflow_instances win ON win.wfl_id = wtk.wfl_id
  WHERE win.win_id = p_win_id AND wtk.wtk_code = p_wtk_code AND wtk.wtk_is_active = true;

  IF v_wtk IS NULL THEN
    RAISE EXCEPTION 'sp_engine_insert_task: no active task with code % on this template', p_wtk_code;
  END IF;

  INSERT INTO ds.wit_workflow_instance_tasks (
    wit_id, win_id, wtk_id, wit_code, wit_name, wit_description, wit_sequence_no,
    wit_task_type, wit_assignment_type, wit_resolved_user_id, wit_priority, wit_state,
    wit_activated_at, wit_due_at, wit_max_retry_count, wit_sla_duration_hours,
    wit_escalation_user_id, wit_escalation_role_id, wit_escalation_dynamic_type,
    created_at, created_by
  ) VALUES (
    gen_random_uuid(), p_win_id, v_wtk.wtk_id, v_wtk.wtk_code, v_wtk.wtk_name, v_wtk.wtk_description,
    v_wtk.wtk_sequence_no, v_wtk.wtk_task_type, v_wtk.wtk_assignment_type, p_assignee_user_id,
    v_wtk.wtk_priority, 'ACTIVE', now(),
    CASE WHEN v_wtk.wtk_sla_duration_hours IS NOT NULL
         THEN now() + (v_wtk.wtk_sla_duration_hours || ' hours')::interval
         ELSE NULL END,
    v_wtk.wtk_max_retry_count, v_wtk.wtk_sla_duration_hours,
    v_wtk.wtk_escalation_user_id, v_wtk.wtk_escalation_role_id, v_wtk.wtk_escalation_dynamic_type,
    now(), p_created_by
  )
  RETURNING wit_id INTO v_wit_id;

  -- Copy notification config — without this, wnt rows never exist for a
  -- DATABASE-created task and notifyWorkflowEvent has nothing to find.
  INSERT INTO ds.wnt_workflow_instance_notifications (
    wnt_id, wit_id, wnt_event_type, wnt_recipient_type, wnt_recipient_user_id,
    wnt_recipient_role_id, wnt_recipient_dynamic_type, wnt_message_template,
    wnt_email_template, wnt_slack_template, created_at, created_by
  )
  SELECT
    gen_random_uuid(), v_wit_id, wtn.wtn_event_type, wtn.wtn_recipient_type, wtn.wtn_recipient_user_id,
    wtn.wtn_recipient_role_id, wtn.wtn_recipient_dynamic_type, wtn.wtn_message_template,
    wtn.wtn_email_template, wtn.wtn_slack_template, now(), p_created_by
  FROM ds.wtn_workflow_template_notifications wtn
  WHERE wtn.wtk_id = v_wtk.wtk_id AND wtn.wtn_is_active = true;

  INSERT INTO ds.wal_workflow_audit_log (
    wal_id, win_id, wit_id, wal_event_type, wal_event_timestamp, wal_performed_by, wal_new_state
  ) VALUES (
    gen_random_uuid(), p_win_id, v_wit_id, 'TASK_ACTIVATED', now(), p_performed_by, 'ACTIVE'
  );

  RETURN QUERY SELECT v_wit_id, p_assignee_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION ds.sp_resolve_first_supervisor(p_owner_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_tms_id     integer;
  v_sup_tms_id integer;
  v_sup_usr_id integer;
BEGIN
  SELECT tms_id INTO v_tms_id FROM ds.tbl_users WHERE usr_id = p_owner_user_id;
  IF v_tms_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT sup_id INTO v_sup_tms_id
  FROM ds.tbl_tms_x_supervisor
  WHERE tms_id = v_tms_id
    AND txs_stadat <= CURRENT_DATE
    AND (txs_enddat IS NULL OR txs_enddat >= CURRENT_DATE)
  ORDER BY txs_stadat DESC
  LIMIT 1;

  IF v_sup_tms_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT usr_id INTO v_sup_usr_id FROM ds.tbl_users WHERE tms_id = v_sup_tms_id LIMIT 1;
  RETURN v_sup_usr_id;
END;
$function$
;

-- Findings Review Workflow procedures (added 2026-09-23).
-- Mirrored from prisma/scripts/findings_review_workflow.sql. They depend on the workflow
-- engine primitives (prisma/scripts/workflow_engine_primitives.sql, NOT seeded — owned by the
-- engine team) and on the two templates (scripts/create-finding-review-templates.py). Until
-- both exist, sp_start_finding_review_workflow finds no published template and returns
-- quietly, so the Run buttons simply create no tasks.
-- ── 1b. Who reviews a finding ──────────────────────────────────────────────
-- A finding goes to its record's project manager, for every entity type: the
-- Workday ID in parentheses at the end of the payload key
-- 'pse__Project_Manager__r.Name' ("Kevin Fino Herrera (10017904)") → an ACTIVE
-- team member (ds.tbl_team_members.wdid, same active rule as
-- getAllActiveTeamMembers) → their app user (ds.tbl_users.tms_id). The engine
-- keys inbox and completion rights on ds.tbl_users.usr_id, so that is what is
-- returned. The snapshot's current value wins; the approved baseline is used
-- if the snapshot has none.
--
-- The key is a literal top-level payload key (same flat lookup the findings
-- engine uses for cdf_field_path). Every entity must carry its PM under exactly
-- 'pse__Project_Manager__r.Name'; an entity without it always gets the fallback.
--
-- Anything that doesn't resolve (key missing, no id, no active team member, or
-- no app user) falls back to Milton Ayala — looked up by email so the same code
-- works everywhere (usr_id 311 in production, 1 locally), with 311 as the last
-- resort.
CREATE OR REPLACE FUNCTION ds.fn_resolve_finding_assignee(p_entity_type text, p_entity_id text)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_fallback_email  text    := 'milton.ayala2@telusinternational.com';
  v_fallback_usr_id integer := 311;
  v_pm              text;
  v_wdid            text;
  v_usr_id          integer;
BEGIN
  SELECT nullif(s.snp_payload ->> 'pse__Project_Manager__r.Name', '') INTO v_pm
  FROM es.snp_entity_snapshot s
  WHERE s.snp_entity_type = p_entity_type AND s.snp_entity_id = p_entity_id;

  IF v_pm IS NULL THEN
    SELECT nullif(a.aps_payload ->> 'pse__Project_Manager__r.Name', '') INTO v_pm
    FROM ds.aps_approved_state a
    WHERE a.cde_entity_type = p_entity_type AND a.aps_entity_id = p_entity_id;
  END IF;

  v_wdid := substring(v_pm FROM '\(([0-9]+)\)\s*$');

  IF v_wdid IS NOT NULL THEN
    SELECT u.usr_id INTO v_usr_id
    FROM ds.tbl_team_members t
    JOIN ds.tbl_users u ON u.tms_id = t.tms_id
    WHERE t.wdid = v_wdid
      AND t.tms_stadat <= CURRENT_DATE
      AND (t.tms_enddat IS NULL OR t.tms_enddat >= CURRENT_DATE)
    ORDER BY t.tms_stadat DESC, u.usr_id
    LIMIT 1;
  END IF;

  IF v_usr_id IS NOT NULL THEN
    RETURN v_usr_id;
  END IF;

  SELECT u.usr_id INTO v_usr_id
  FROM ds.tbl_users u
  WHERE lower(u.usr_email) = v_fallback_email
  ORDER BY u.usr_id
  LIMIT 1;

  RETURN coalesce(v_usr_id, v_fallback_usr_id);
END;
$$;


-- ── 2. Initiator (wfl_instantiate_proc_name on both templates) ──────────────
-- Called per finding by fn_create_finding_tasks. Assigns the project manager
-- (ds.fn_resolve_finding_assignee). Never raises: one bad finding
-- must not stop the rest of the batch, and a workflow problem must never touch
-- the finding itself (the EXCEPTION block rolls back only this call's writes).
CREATE OR REPLACE FUNCTION ds.sp_start_finding_review_workflow(p_fnd_id integer)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_f                ds.fnd_findings%ROWTYPE;
  v_rule             record;
  v_wfl_code         text;
  v_wtk_code         text;
  v_task_name        text;
  v_wfl_id           uuid;
  v_win_id           uuid;
  v_field_label      text;
  v_expected         text;
  v_context          jsonb;
  v_changed_fields   jsonb;
  v_when_field       text;
  v_when_label       text;
  v_assignee_user_id integer;  -- the project manager, see ds.fn_resolve_finding_assignee
  v_by               text := 'system:sp_start_finding_review_workflow';
BEGIN
  SELECT * INTO v_f FROM ds.fnd_findings WHERE fnd_id = p_fnd_id FOR UPDATE;

  -- win_id is the idempotency key: a finding with a task is never touched again.
  IF NOT FOUND OR v_f.win_id IS NOT NULL OR v_f.status NOT IN ('open', 'acknowledged') THEN
    RETURN;
  END IF;

  IF v_f.rul_id IS NULL THEN
    v_wfl_code  := 'FINDING_CHANGE_REVIEW';
    v_wtk_code  := 'REVIEW_CHANGE';
    v_task_name := 'Review Change';
  ELSE
    v_wfl_code  := 'FINDING_RULE_REVIEW';
    v_wtk_code  := 'REVIEW_RULE_FLAG';
    v_task_name := 'Review Rule Flag';
    SELECT rul_type, rul_definition INTO v_rule FROM ds.rul_detection_rules WHERE rul_id = v_f.rul_id;
  END IF;

  SELECT wfl_id INTO v_wfl_id
  FROM ds.wfl_workflow_templates
  WHERE wfl_code = v_wfl_code AND wfl_status = 'PUBLISHED'
  ORDER BY wfl_version_no DESC
  LIMIT 1;

  IF v_wfl_id IS NULL THEN
    RETURN;  -- no published template yet: degrade gracefully, the finding stays task-less
  END IF;

  v_assignee_user_id := ds.fn_resolve_finding_assignee(v_f.cde_entity_type, v_f.fnd_entity_id);

  SELECT cdf_display_name INTO v_field_label
  FROM ds.cdf_watched_fields
  WHERE cde_entity_type = v_f.cde_entity_type AND cdf_field_path = v_f.cdf_field_path;
  v_field_label := coalesce(v_field_label, v_f.cdf_field_path, '(whole record)');

  v_context := jsonb_build_array(
    jsonb_build_object('key', 'findingId',  'value', p_fnd_id::text),
    jsonb_build_object('key', 'entityType', 'value', v_f.cde_entity_type),
    jsonb_build_object('key', 'entityId',   'value', v_f.fnd_entity_id),
    jsonb_build_object('key', 'fieldPath',  'value', v_f.cdf_field_path),
    jsonb_build_object('key', 'severity',   'value', v_f.severity),
    jsonb_build_object('key', 'assigneeUserId', 'value', v_assignee_user_id::text),
    jsonb_build_object('key', 'oldValue',   'value', v_f.old_value #>> '{}'),
    jsonb_build_object('key', 'newValue',   'value', v_f.new_value #>> '{}')
  );

  IF v_f.rul_id IS NULL THEN
    v_context := v_context || jsonb_build_array(jsonb_build_object('key', 'changeType', 'value', v_f.change_type));
    v_changed_fields := jsonb_build_array(jsonb_build_object(
      'field', v_field_label, 'oldValue', v_f.old_value, 'newValue', v_f.new_value));
  ELSE
    v_expected := CASE v_rule.rul_type
      WHEN 'required_not_null' THEN 'must be filled in'
      WHEN 'required_empty'    THEN 'must be empty'
      WHEN 'range_check'       THEN format('must be between %s and %s',
                                           v_rule.rul_definition ->> 'min', v_rule.rul_definition ->> 'max')
      WHEN 'boolean_equals'    THEN format('must be %s', v_rule.rul_definition ->> 'expected')
      WHEN 'required_when'     THEN format('must be filled in when %s %s "%s"',
                                           v_rule.rul_definition #>> '{when,field}',
                                           CASE v_rule.rul_definition #>> '{when,operator}'
                                             WHEN 'equals' THEN 'is'
                                             WHEN 'starts_with' THEN 'starts with'
                                             ELSE v_rule.rul_definition #>> '{when,operator}' END,
                                           v_rule.rul_definition #>> '{when,value}')
      ELSE v_rule.rul_type
    END;
    v_context := v_context || jsonb_build_array(
      jsonb_build_object('key', 'ruleId',         'value', v_f.rul_id::text),
      jsonb_build_object('key', 'ruleType',       'value', v_rule.rul_type),
      jsonb_build_object('key', 'ruleDefinition', 'value', v_rule.rul_definition::text));
    -- The task drawer only renders changedFields; for a rule flag, "old" is what
    -- the rule expects and "new" is the value the snapshot actually holds.
    v_changed_fields := jsonb_build_array(jsonb_build_object(
      'field',    format('%s (rule #%s)', v_field_label, v_f.rul_id),
      'oldValue', 'Expected: ' || v_expected,
      'newValue', coalesce(v_f.new_value, '"(missing)"'::jsonb)));

    -- A conditional rule also shows the condition field's current value, so the
    -- reviewer can see why it fired.
    IF v_rule.rul_type = 'required_when' THEN
      v_when_field := v_rule.rul_definition #>> '{when,field}';
      SELECT cdf_display_name INTO v_when_label
      FROM ds.cdf_watched_fields
      WHERE cde_entity_type = v_f.cde_entity_type AND cdf_field_path = v_when_field;

      v_changed_fields := v_changed_fields || jsonb_build_array(jsonb_build_object(
        'field',    format('%s (condition)', coalesce(v_when_label, v_when_field)),
        'oldValue', 'Rule applies when this matches',
        'newValue', (SELECT s.snp_payload -> v_when_field FROM es.snp_entity_snapshot s
                      WHERE s.snp_entity_type = v_f.cde_entity_type AND s.snp_entity_id = v_f.fnd_entity_id)));
    END IF;
  END IF;

  v_win_id := ds.sp_engine_create_instance(
    p_wfl_id                  := v_wfl_id,
    p_business_reference_type := 'Finding',
    p_business_reference_id   := p_fnd_id::text,
    p_owner_user_id           := NULL,  -- no acting user: the run is system-driven
    p_started_by              := v_by,
    p_created_by              := 'system',
    p_context                 := v_context
  );

  INSERT INTO ds.wic_workflow_instance_context (wic_id, win_id, wic_key, wic_value_json, created_at, created_by)
  VALUES (gen_random_uuid(), v_win_id, 'changedFields', v_changed_fields, now(), 'system');

  PERFORM ds.sp_engine_insert_task(
    p_win_id           := v_win_id,
    p_wtk_code         := v_wtk_code,
    p_assignee_user_id := v_assignee_user_id,
    p_performed_by     := v_by,
    p_created_by       := 'system'
  );

  UPDATE ds.fnd_findings SET win_id = v_win_id WHERE fnd_id = p_fnd_id;

  PERFORM com.sp_notify_user(
    p_user_id       := v_assignee_user_id,
    p_item_type     := 'workflow-task',
    p_payload       := jsonb_build_object(
      'description', CASE WHEN v_f.rul_id IS NULL
        THEN format('%s %s: %s changed and needs review.', initcap(v_f.cde_entity_type), v_f.fnd_entity_id, v_field_label)
        ELSE format('%s %s: %s %s.', initcap(v_f.cde_entity_type), v_f.fnd_entity_id, v_field_label, v_expected)
      END,
      'taskName', v_task_name,
      'link', '/my-tasks?tab=workflow',
      'isActionable', true
    ),
    p_category_name := 'Inbox',
    p_created_by    := 'system'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sp_start_finding_review_workflow failed for fnd_id=%: %', p_fnd_id, SQLERRM;
END;
$$;


-- ── 3. Outcome procedure (wto_outcome_proc_name on every outcome) ───────────
-- Called by TaskCompletionOrchestrator inside the reviewer's completion
-- transaction. By then the engine has already moved the task out of ACTIVE —
-- that happens for every outcome — so "keep the work open" means inserting a
-- follow-up task, not skipping completion.
--
-- The engine audits only the first returned row, so Agree (which writes both
-- the finding and the baseline) audits the baseline change; the finding's own
-- transition is recorded on the row (resolved_by/resolved_at) and in the WAL.
CREATE OR REPLACE FUNCTION ds.sp_handle_finding_outcome(
  p_win_id                text,
  p_wit_id                text,
  p_outcome_code          text,
  p_business_reference_id text,
  p_performed_by          text,
  p_performed_by_user_id  text,
  p_params                jsonb
)
RETURNS TABLE (
  activated_wit_id  uuid,
  activated_user_id integer,
  entity_name       text,
  entity_id         text,
  old_values        jsonb,
  new_values        jsonb,
  comment           text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_fnd_id           integer := p_business_reference_id::integer;
  v_f                ds.fnd_findings%ROWTYPE;
  v_reviewer_comment text;
  v_aps_before       ds.aps_approved_state%ROWTYPE;
  v_aps_after        ds.aps_approved_state%ROWTYPE;
  v_value            jsonb;
  v_follow_up_code   text;
  v_act_wit_id       uuid;
  v_act_user_id      integer;
  v_entity_name      text;
  v_entity_id        text;
  v_old              jsonb;
  v_new              jsonb;
  v_comment          text;
  v_assignee_user_id integer;
  v_complete         boolean := true;
BEGIN
  SELECT * INTO v_f FROM ds.fnd_findings WHERE fnd_id = v_fnd_id FOR UPDATE;

  -- A follow-up stays with whoever had the review task (the PM); resolve afresh
  -- only if that is somehow missing.
  SELECT t.wit_resolved_user_id INTO v_assignee_user_id
  FROM ds.wit_workflow_instance_tasks t WHERE t.wit_id = p_wit_id::uuid;
  v_assignee_user_id := coalesce(v_assignee_user_id,
                                 ds.fn_resolve_finding_assignee(v_f.cde_entity_type, v_f.fnd_entity_id));

  -- TaskCompletionOrchestrator always passes p_params = '{}', but it has already
  -- written the reviewer's comment onto the task row in this same transaction.
  SELECT nullif(btrim(t.wit_result_comment), '') INTO v_reviewer_comment
  FROM ds.wit_workflow_instance_tasks t WHERE t.wit_id = p_wit_id::uuid;
  v_reviewer_comment := coalesce(nullif(btrim(p_params ->> 'comment'), ''), v_reviewer_comment);

  IF v_f.fnd_id IS NOT NULL AND v_f.status IN ('open', 'acknowledged') THEN

    IF p_outcome_code = 'AGREE' AND v_f.rul_id IS NULL THEN
      IF v_f.cdf_field_path IS NULL THEN
        -- Raising leaves the task ACTIVE (the whole completion rolls back).
        RAISE EXCEPTION 'Finding % has no field path; agree to it by updating the baseline directly', v_fnd_id;
      END IF;

      -- A 'deleted' change has a NULL new_value; jsonb_set(…, NULL) would null the
      -- whole payload, so a removed value becomes JSON null in the baseline.
      v_value := coalesce(v_f.new_value, 'null'::jsonb);

      SELECT * INTO v_aps_before FROM ds.aps_approved_state
      WHERE cde_entity_type = v_f.cde_entity_type AND aps_entity_id = v_f.fnd_entity_id
      FOR UPDATE;

      INSERT INTO ds.aps_approved_state AS a
        (cde_entity_type, aps_entity_id, aps_payload, aps_approved_by, aps_approved_at, fnd_source_finding)
      VALUES
        (v_f.cde_entity_type, v_f.fnd_entity_id, jsonb_build_object(v_f.cdf_field_path, v_value),
         p_performed_by, now(), v_f.fnd_id)
      ON CONFLICT (cde_entity_type, aps_entity_id) DO UPDATE
        SET aps_payload        = jsonb_set(a.aps_payload, ARRAY[v_f.cdf_field_path], v_value, true),
            aps_approved_by    = EXCLUDED.aps_approved_by,
            aps_approved_at    = EXCLUDED.aps_approved_at,
            fnd_source_finding = EXCLUDED.fnd_source_finding
      RETURNING a.* INTO v_aps_after;

      UPDATE ds.fnd_findings
         SET status      = 'approved',
             resolved_by = p_performed_by,
             resolved_at = now(),
             resolution  = coalesce(v_reviewer_comment, 'Agreed: new value approved as the baseline')
       WHERE fnd_id = v_fnd_id;

      v_entity_name := 'aps_approved_state';
      v_entity_id   := v_f.cde_entity_type || ':' || v_f.fnd_entity_id;
      v_old         := CASE WHEN v_aps_before.aps_entity_id IS NULL THEN NULL ELSE to_jsonb(v_aps_before) END;
      v_new         := to_jsonb(v_aps_after);
      v_comment     := format('Finding #%s agreed: baseline %s.%s advanced, finding approved',
                              v_fnd_id, v_f.fnd_entity_id, v_f.cdf_field_path);

    ELSIF p_outcome_code IN ('DISAGREE', 'MARK_RESOLVED') THEN
      UPDATE ds.fnd_findings
         SET status     = 'acknowledged',
             resolution = coalesce(v_reviewer_comment, resolution)
       WHERE fnd_id = v_fnd_id;

      -- The engine already took the review task out of ACTIVE; this keeps the
      -- work in the inbox until a later run proves the fix (fn_close_resolved_finding_tasks).
      v_follow_up_code := CASE WHEN v_f.rul_id IS NULL THEN 'AWAIT_CHANGE_FIX' ELSE 'AWAIT_RULE_FIX' END;

      SELECT t.activated_wit_id, t.activated_user_id
        INTO v_act_wit_id, v_act_user_id
        FROM ds.sp_engine_insert_task(
          p_win_id           := p_win_id::uuid,
          p_wtk_code         := v_follow_up_code,
          p_assignee_user_id := v_assignee_user_id,
          p_performed_by     := p_performed_by,
          p_created_by       := p_performed_by
        ) AS t;

      v_complete    := false;  -- the follow-up keeps the instance open
      v_entity_name := 'fnd_findings';
      v_entity_id   := v_fnd_id::text;
      v_old         := jsonb_build_object('fnd_id', v_fnd_id, 'status', v_f.status, 'resolution', v_f.resolution);
      v_new         := jsonb_build_object('fnd_id', v_fnd_id, 'status', 'acknowledged',
                                          'resolution', coalesce(v_reviewer_comment, v_f.resolution));
      v_comment     := format('Finding #%s %s by reviewer — awaiting a snapshot that shows the fix',
                              v_fnd_id, CASE p_outcome_code WHEN 'DISAGREE' THEN 'disagreed' ELSE 'marked resolved' END);

    ELSIF p_outcome_code = 'DISMISS' THEN
      UPDATE ds.fnd_findings
         SET status      = 'dismissed',
             resolved_by = p_performed_by,
             resolved_at = now(),
             resolution  = coalesce(v_reviewer_comment, 'Dismissed by reviewer without a fix')
       WHERE fnd_id = v_fnd_id;

      v_entity_name := 'fnd_findings';
      v_entity_id   := v_fnd_id::text;
      v_old         := jsonb_build_object('fnd_id', v_fnd_id, 'status', v_f.status);
      v_new         := jsonb_build_object('fnd_id', v_fnd_id, 'status', 'dismissed');
      v_comment     := format('Finding #%s dismissed by reviewer', v_fnd_id);
    END IF;
    -- Any other code: no mutation, no audit row (the engine's safe fall-through rule).
  END IF;
  -- A finding already closed some other way (fixed, superseded, retired) is left
  -- as-is; the reviewer's action just finishes the task.

  IF v_complete THEN
    PERFORM ds.sp_engine_complete_instance_if_done(
      p_win_id               := p_win_id::uuid,
      p_wit_id               := p_wit_id::uuid,
      p_route_found          := false,
      p_performed_by         := p_performed_by,
      p_performed_by_user_id := p_performed_by_user_id
    );
  END IF;

  RETURN QUERY SELECT v_act_wit_id, v_act_user_id, v_entity_name, v_entity_id, v_old, v_new, v_comment;
END;
$$;


-- ── 4a. Create one task per live finding that has none ──────────────────────
-- Returns the findings that got a task, so the caller can count and audit them.
CREATE OR REPLACE FUNCTION ds.fn_create_finding_tasks()
RETURNS TABLE (fnd_id integer, win_id uuid)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  r     record;
  v_win uuid;
BEGIN
  FOR r IN
    SELECT f.fnd_id FROM ds.fnd_findings f
     WHERE f.status IN ('open', 'acknowledged') AND f.win_id IS NULL
     ORDER BY f.fnd_id
  LOOP
    PERFORM ds.sp_start_finding_review_workflow(r.fnd_id);

    SELECT f.win_id INTO v_win FROM ds.fnd_findings f WHERE f.fnd_id = r.fnd_id;
    IF v_win IS NOT NULL THEN
      fnd_id := r.fnd_id;
      win_id := v_win;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;


-- ── 4b. Close the open task of every finding that no longer needs review ────
-- The engine has no primitive to complete a task without a human outcome, and
-- sp_engine_complete_instance_if_done returns early while any task is ACTIVE.
-- So this does the two writes TaskCompletionOrchestrator does for a completed
-- task (Step 6: task row, Step 10: TASK_COMPLETED WAL entry) and then hands off
-- to the engine primitive for instance completion. wit_outcome_code records why
-- (SELF_RESOLVED, RESOLVED_CONFIRMED, SUPERSEDED, RULE_RETIRED, APPROVED).
-- 'approved' is a safety net only: Agree already completes its own task.
CREATE OR REPLACE FUNCTION ds.fn_close_resolved_finding_tasks()
RETURNS TABLE (fnd_id integer, win_id uuid, wit_id uuid, finding_status text)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  r    record;
  v_by text := 'system:fn_close_resolved_finding_tasks';
BEGIN
  FOR r IN
    SELECT f.fnd_id, f.win_id, f.status, t.wit_id, t.wit_state
      FROM ds.fnd_findings f
      JOIN ds.wit_workflow_instance_tasks t
        ON t.win_id = f.win_id AND t.wit_state IN ('ACTIVE', 'PENDING')
     WHERE f.win_id IS NOT NULL
       AND f.status IN ('self_resolved', 'resolved_confirmed', 'superseded', 'rule_retired', 'approved')
     ORDER BY f.fnd_id
  LOOP
    UPDATE ds.wit_workflow_instance_tasks t
       SET wit_state          = 'SUCCESS',
           wit_completed_at   = now(),
           wit_completed_by   = v_by,
           wit_outcome_code   = upper(r.status),
           wit_result_comment = format('Closed automatically: finding %s', replace(r.status, '_', ' ')),
           updated_at         = now(),
           updated_by         = v_by
     WHERE t.wit_id = r.wit_id;

    INSERT INTO ds.wal_workflow_audit_log (
      wal_id, win_id, wit_id, wal_event_type, wal_event_timestamp, wal_performed_by, wal_old_state, wal_new_state
    ) VALUES (
      gen_random_uuid(), r.win_id, r.wit_id, 'TASK_COMPLETED', now(), v_by, r.wit_state, 'SUCCESS'
    );

    PERFORM ds.sp_engine_complete_instance_if_done(
      p_win_id               := r.win_id,
      p_wit_id               := r.wit_id,
      p_route_found          := false,
      p_performed_by         := v_by,
      p_performed_by_user_id := NULL
    );

    fnd_id         := r.fnd_id;
    win_id         := r.win_id;
    wit_id         := r.wit_id;
    finding_status := r.status;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Findings Review Workflow templates (added 2026-09-25) — the only change-detection data
-- the seed still inserts. Mirrored from prisma/scripts/findings_review_templates.sql.
DO $do$
BEGIN
  -- Finding Review — Change: skipped if a PUBLISHED version already exists (e.g. authored in the admin UI).
  IF NOT EXISTS (SELECT 1 FROM ds.wfl_workflow_templates WHERE wfl_code = 'FINDING_CHANGE_REVIEW' AND wfl_status = 'PUBLISHED') THEN
    INSERT INTO ds.wfl_workflow_templates
    SELECT (jsonb_populate_record(NULL::ds.wfl_workflow_templates, $json${"wec_id": null, "wfl_id": "80d5f66a-3291-4ccc-9759-99594416ebc5", "wfl_code": "FINDING_CHANGE_REVIEW", "wfl_name": "Finding Review — Change", "created_at": "2026-09-23T22:57:30.202+00:00", "created_by": "1", "updated_at": "2026-09-23T22:57:30.415+00:00", "updated_by": "1", "wfl_status": "PUBLISHED", "wfl_is_active": true, "wfl_version_no": 1, "wfl_description": "Review a watched field that drifted from its approved baseline.", "wfl_effective_to": null, "wfl_effective_from": "2026-09-23T22:57:30.415+00:00", "wfl_execution_type": "DATABASE", "wfl_instantiate_proc_name": "sp_start_finding_review_workflow"}$json$::jsonb
            || jsonb_build_object('created_at', now(), 'created_by', 'system:deploy', 'updated_at', NULL,
                                  'updated_by', NULL, 'wfl_effective_from', now()))).*
    ON CONFLICT (wfl_id) DO NOTHING;

    INSERT INTO ds.wtk_workflow_template_tasks
    SELECT (jsonb_populate_record(NULL::ds.wtk_workflow_template_tasks, e
            || jsonb_build_object('created_at', now(), 'created_by', 'system:deploy', 'updated_at', NULL, 'updated_by', NULL))).*
    FROM jsonb_array_elements($json$[{"wfl_id": "80d5f66a-3291-4ccc-9759-99594416ebc5", "wtk_id": "5ebc5a51-0b20-4f96-ac8c-accea20f4db6", "wtk_code": "REVIEW_CHANGE", "wtk_name": "Review Change", "created_at": "2026-09-23T22:57:30.276+00:00", "created_by": "1", "updated_at": null, "updated_by": null, "wtk_priority": "MEDIUM", "wtk_is_active": true, "wtk_task_type": "MANUAL", "wtk_allow_fail": true, "wtk_description": "A watched field changed from its approved baseline. Agree to accept the new value as the baseline, or Disagree to keep the baseline and wait for the source system to be corrected.", "wtk_sequence_no": 1, "wtk_assignment_type": "CONTEXT", "wtk_max_retry_count": 0, "wtk_assigned_role_id": null, "wtk_assigned_user_id": null, "wtk_is_starting_task": true, "wtk_allow_reassignment": true, "wtk_escalation_role_id": null, "wtk_escalation_user_id": null, "wtk_sla_duration_hours": null, "wtk_dynamic_assignment_type": null, "wtk_escalation_dynamic_type": null, "wtk_require_comment_on_reassign": true}, {"wfl_id": "80d5f66a-3291-4ccc-9759-99594416ebc5", "wtk_id": "e99d6e3e-ab71-49f6-8c7b-f1b69733dbdd", "wtk_code": "AWAIT_CHANGE_FIX", "wtk_name": "Awaiting Fix", "created_at": "2026-09-23T22:57:30.381+00:00", "created_by": "1", "updated_at": null, "updated_by": null, "wtk_priority": "MEDIUM", "wtk_is_active": true, "wtk_task_type": "MANUAL", "wtk_allow_fail": true, "wtk_description": "You disagreed with this change. Closes automatically once a snapshot shows the approved value again. Agree if you change your mind and accept the new value.", "wtk_sequence_no": 2, "wtk_assignment_type": "CONTEXT", "wtk_max_retry_count": 0, "wtk_assigned_role_id": null, "wtk_assigned_user_id": null, "wtk_is_starting_task": false, "wtk_allow_reassignment": true, "wtk_escalation_role_id": null, "wtk_escalation_user_id": null, "wtk_sla_duration_hours": null, "wtk_dynamic_assignment_type": null, "wtk_escalation_dynamic_type": null, "wtk_require_comment_on_reassign": true}]$json$::jsonb) e
    ON CONFLICT (wtk_id) DO NOTHING;

    INSERT INTO ds.wto_workflow_template_task_outcomes
    SELECT (jsonb_populate_record(NULL::ds.wto_workflow_template_task_outcomes, e
            || jsonb_build_object('created_at', now(), 'created_by', 'system:deploy'))).*
    FROM jsonb_array_elements($json$[{"wtk_id": "5ebc5a51-0b20-4f96-ac8c-accea20f4db6", "wto_id": "fe203b12-ff5f-4fea-9334-86e5ac1e78a5", "wto_code": "AGREE", "wto_label": "Agree", "created_at": "2026-09-23T22:57:30.325+00:00", "created_by": "1", "wto_description": "Accept the new value; the approved baseline advances.", "wto_is_terminal": true, "wto_execution_type": "DATABASE", "wto_outcome_proc_name": "sp_handle_finding_outcome", "wto_triggers_outcome_action": true}, {"wtk_id": "5ebc5a51-0b20-4f96-ac8c-accea20f4db6", "wto_id": "533dcf52-5f8c-4fd0-b415-de22f69a2654", "wto_code": "DISAGREE", "wto_label": "Disagree", "created_at": "2026-09-23T22:57:30.362+00:00", "created_by": "1", "wto_description": "Keep the baseline; the finding stays tracked until a snapshot shows it fixed.", "wto_is_terminal": false, "wto_execution_type": "DATABASE", "wto_outcome_proc_name": "sp_handle_finding_outcome", "wto_triggers_outcome_action": true}, {"wtk_id": "e99d6e3e-ab71-49f6-8c7b-f1b69733dbdd", "wto_id": "48261bfd-24b3-4537-8a1d-e01d1970f000", "wto_code": "AGREE", "wto_label": "Agree (accept new value)", "created_at": "2026-09-23T22:57:30.395+00:00", "created_by": "1", "wto_description": "Accept the new value after all; the approved baseline advances.", "wto_is_terminal": true, "wto_execution_type": "DATABASE", "wto_outcome_proc_name": "sp_handle_finding_outcome", "wto_triggers_outcome_action": true}]$json$::jsonb) e
    ON CONFLICT (wto_id) DO NOTHING;
  END IF;
END
$do$;

DO $do$
BEGIN
  -- Finding Review — Rule: skipped if a PUBLISHED version already exists (e.g. authored in the admin UI).
  IF NOT EXISTS (SELECT 1 FROM ds.wfl_workflow_templates WHERE wfl_code = 'FINDING_RULE_REVIEW' AND wfl_status = 'PUBLISHED') THEN
    INSERT INTO ds.wfl_workflow_templates
    SELECT (jsonb_populate_record(NULL::ds.wfl_workflow_templates, $json${"wec_id": null, "wfl_id": "c40061cc-ba39-4e8a-9516-b1c23136f43d", "wfl_code": "FINDING_RULE_REVIEW", "wfl_name": "Finding Review — Rule", "created_at": "2026-09-23T22:57:30.437+00:00", "created_by": "1", "updated_at": "2026-09-23T22:57:30.499+00:00", "updated_by": "1", "wfl_status": "PUBLISHED", "wfl_is_active": true, "wfl_version_no": 1, "wfl_description": "Review a value that violates a state detection rule.", "wfl_effective_to": null, "wfl_effective_from": "2026-09-23T22:57:30.499+00:00", "wfl_execution_type": "DATABASE", "wfl_instantiate_proc_name": "sp_start_finding_review_workflow"}$json$::jsonb
            || jsonb_build_object('created_at', now(), 'created_by', 'system:deploy', 'updated_at', NULL,
                                  'updated_by', NULL, 'wfl_effective_from', now()))).*
    ON CONFLICT (wfl_id) DO NOTHING;

    INSERT INTO ds.wtk_workflow_template_tasks
    SELECT (jsonb_populate_record(NULL::ds.wtk_workflow_template_tasks, e
            || jsonb_build_object('created_at', now(), 'created_by', 'system:deploy', 'updated_at', NULL, 'updated_by', NULL))).*
    FROM jsonb_array_elements($json$[{"wfl_id": "c40061cc-ba39-4e8a-9516-b1c23136f43d", "wtk_id": "33e6e813-368c-49c4-868c-f8584dfa503e", "wtk_code": "REVIEW_RULE_FLAG", "wtk_name": "Review Rule Flag", "created_at": "2026-09-23T22:57:30.446+00:00", "created_by": "1", "updated_at": null, "updated_by": null, "wtk_priority": "MEDIUM", "wtk_is_active": true, "wtk_task_type": "MANUAL", "wtk_allow_fail": true, "wtk_description": "A value violates a detection rule. Fix it in the source system, then Mark as Resolved; the flag closes once a snapshot confirms the fix.", "wtk_sequence_no": 1, "wtk_assignment_type": "CONTEXT", "wtk_max_retry_count": 0, "wtk_assigned_role_id": null, "wtk_assigned_user_id": null, "wtk_is_starting_task": true, "wtk_allow_reassignment": true, "wtk_escalation_role_id": null, "wtk_escalation_user_id": null, "wtk_sla_duration_hours": null, "wtk_dynamic_assignment_type": null, "wtk_escalation_dynamic_type": null, "wtk_require_comment_on_reassign": true}, {"wfl_id": "c40061cc-ba39-4e8a-9516-b1c23136f43d", "wtk_id": "deee4b0c-34bb-45ec-a124-1c5a62c64b1c", "wtk_code": "AWAIT_RULE_FIX", "wtk_name": "Awaiting Confirmation", "created_at": "2026-09-23T22:57:30.469+00:00", "created_by": "1", "updated_at": null, "updated_by": null, "wtk_priority": "MEDIUM", "wtk_is_active": true, "wtk_task_type": "MANUAL", "wtk_allow_fail": true, "wtk_description": "Marked as resolved. Closes automatically once a snapshot shows the rule passing. Dismiss to close the flag without a fix.", "wtk_sequence_no": 2, "wtk_assignment_type": "CONTEXT", "wtk_max_retry_count": 0, "wtk_assigned_role_id": null, "wtk_assigned_user_id": null, "wtk_is_starting_task": false, "wtk_allow_reassignment": true, "wtk_escalation_role_id": null, "wtk_escalation_user_id": null, "wtk_sla_duration_hours": null, "wtk_dynamic_assignment_type": null, "wtk_escalation_dynamic_type": null, "wtk_require_comment_on_reassign": true}]$json$::jsonb) e
    ON CONFLICT (wtk_id) DO NOTHING;

    INSERT INTO ds.wto_workflow_template_task_outcomes
    SELECT (jsonb_populate_record(NULL::ds.wto_workflow_template_task_outcomes, e
            || jsonb_build_object('created_at', now(), 'created_by', 'system:deploy'))).*
    FROM jsonb_array_elements($json$[{"wtk_id": "33e6e813-368c-49c4-868c-f8584dfa503e", "wto_id": "202292f5-d5ed-48ca-b10c-43526c421421", "wto_code": "MARK_RESOLVED", "wto_label": "Mark as Resolved", "created_at": "2026-09-23T22:57:30.46+00:00", "created_by": "1", "wto_description": "The source is being fixed; wait for a snapshot to confirm it.", "wto_is_terminal": false, "wto_execution_type": "DATABASE", "wto_outcome_proc_name": "sp_handle_finding_outcome", "wto_triggers_outcome_action": true}, {"wtk_id": "deee4b0c-34bb-45ec-a124-1c5a62c64b1c", "wto_id": "7b820435-fd67-40e1-8bb2-67c7b73b9509", "wto_code": "DISMISS", "wto_label": "Dismiss", "created_at": "2026-09-23T22:57:30.486+00:00", "created_by": "1", "wto_description": "Close the flag without waiting for a fix.", "wto_is_terminal": true, "wto_execution_type": "DATABASE", "wto_outcome_proc_name": "sp_handle_finding_outcome", "wto_triggers_outcome_action": true}]$json$::jsonb) e
    ON CONFLICT (wto_id) DO NOTHING;
  END IF;
END
$do$;


-- WatchedFields — Object/Field Manager screen (added 2026-09-18)
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at)
  VALUES (59, 'WatchedFields', 'milton.ayala2@telusdigital.com', now()) ON CONFLICT (opt_id) DO NOTHING;

DO $$
BEGIN
  -- admin (rol_id=1)
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'WatchedFields' AND rol_id = 1) THEN
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id)
      VALUES ('WatchedFields', true, true, true, NULL, NOW(), 59, 1);
  END IF;
  -- user (rol_id=2)
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions WHERE per_resource = 'WatchedFields' AND rol_id = 2) THEN
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id)
      VALUES ('WatchedFields', true, true, true, NULL, NOW(), 59, 2);
  END IF;
END $$;

-- CHECK constraints on ds.cdf_watched_fields (Prisma schema DSL cannot express CHECK
-- constraints). Mirrored from prisma/scripts/add_watched_fields_check_constraints.sql,
-- because seed.sql is the only file setup-local-db.sh actually executes.
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

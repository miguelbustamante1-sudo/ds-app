-- ============================================================
-- Reference Data Seed
-- Run after Prisma migrations to populate the database with
-- all reference/lookup data required for the app to function.
--
-- This script is idempotent — safe to run multiple times.
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
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (40, 'TimeOffException',        'miguel.bustamante01@telusinternational.com',  '2026-04-24 18:05:30.559+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (41, 'SupervisorHolidaySwaps',  'miguel.bustamante01@telusinternational.com',  '2026-04-27 12:24:15.468+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (42, 'HolidaySwapException',    'miguel.bustamante01@telusinternational.com',  '2026-04-27 18:23:25.937+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (43, 'PersistenceTemplates',    'miguel.bustamante01@telusinternational.com',  '2026-04-28 17:46:32.401+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (44, 'PersistenceDataTypes',    'miguel.bustamante01@telusinternational.com',  '2026-04-28 17:46:49.706+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (46, 'Shift',                   'miguel.bustamante01@telusinternational.com',  '2026-05-07 23:39:34.007+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (47, 'Positions',               'miguel.bustamante01@telusinternational.com',  '2026-05-10 01:42:07.545+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (49, 'Workflow',                'miguel.bustamante01@telusinternational.com',  '2026-05-24 13:50:35.456+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (50, 'WorkflowAdmin',           'miguel.bustamante01@telusinternational.com',  '2026-05-24 13:50:48.407+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (51, 'CompensatoryTime',        'miguel.bustamante01@telusinternational.com',  '2026-05-24 13:53:01.629+00')    ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at) VALUES (52, 'SupervisorCompTime',      'miguel.bustamante01@telusinternational.com',  '2026-05-24 13:53:01.629+00')    ON CONFLICT (opt_id) DO NOTHING;
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

END $$;

-- ============================================================
-- DEV ONLY — do NOT run in production
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

-- Dev auth user
INSERT INTO sec.auth_users (id, onelogin_id, email, first_name, last_name, roles, created_at, updated_at)
VALUES (1, 'dev-1', :'dev_email', 'Dev', 'User', ARRAY['user', 'admin', 'bsa'], now(), now()) ON CONFLICT (id) DO NOTHING;

-- Dev user role assignments (admin + user)
INSERT INTO sec.uro_user_roles (usr_id, rol_id) VALUES (1, 1) ON CONFLICT (usr_id, rol_id) DO NOTHING;

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
-- Advance the sequence past the manually inserted IDs
SELECT setval(pg_get_serial_sequence('ds.hol_holiday', 'hol_id'), (SELECT MAX(hol_id) FROM ds.hol_holiday));

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
SELECT setval(pg_get_serial_sequence('ds.cpl_corporate_phone_lines', 'cpl_id'), (SELECT MAX(cpl_id) FROM ds.cpl_corporate_phone_lines));

-- 17. Corporate Phone Assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cpa_corporate_phone_assignments LIMIT 1) THEN
    INSERT INTO ds.cpa_corporate_phone_assignments (cpl_id, tms_id, cpa_bill_rate, cpa_assign_date_start, cpa_assign_date_end, cpa_billable, cpa_remarks, cpa_created_at, usr_id_created_by, usr_id_updated_by, cpa_deleted_at, cpa_deleted)
    VALUES
      (1, 61, 25.00, '2026-01-01', NULL, true,  'Initial migration, assigning starting 1 Jan 2026 to Ernesto Menjívar Colorado (10083492)', NOW(), 1, NULL, NULL, false),
      (2, 87, 25.00, '2026-01-01', NULL, true,  'Initial migration, assigning starting 1 Jan 2026 to Roberto Pineda Urrutia (10029794)',    NOW(), 1, NULL, NULL, false),
      (3, 5,  25.00, '2026-01-01', NULL, true,  'Initial migration, assigning starting 1 Jan 2026 to Josue Guillen Rosales (10100154)',     NOW(), 1, NULL, NULL, false);
  END IF;
END $$;
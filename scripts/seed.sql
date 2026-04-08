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
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (2, 'Acknowledge') ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (3, 'Taken')       ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (4, 'Cancelled')   ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (5, 'Rejected')    ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (6, 'Split')       ON CONFLICT (sta_id) DO NOTHING;

-- 2. Regions
INSERT INTO ds.reg_regions (reg_id, reg_name) VALUES (1, 'Central America') ON CONFLICT (reg_id) DO NOTHING;

-- 3. Countries
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso, cou_currency_symbol) VALUES (1, 'El Salvador', 1, 'SV', '$')  ON CONFLICT (cou_id) DO NOTHING;
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso, cou_currency_symbol) VALUES (2, 'Guatemala',   1, 'GT', 'Q')  ON CONFLICT (cou_id) DO NOTHING;
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso, cou_currency_symbol) VALUES (3, 'Mexico',      1, 'MX', NULL) ON CONFLICT (cou_id) DO NOTHING;

-- 4. Time Off Categories
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

-- 5. Team Member Roles
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (1,  'Admin Team Leader',      'Admin Team Leader')      ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (2,  'AGM',                    'AGM')                    ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (3,  'Application Support',    'Application Support')    ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (4,  'Back End Developer',     'Back End Developer')     ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (5,  'Business Support Analyst','Business Support Analyst') ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (6,  'Business Systems Analyst','Business Systems Analyst') ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (7,  'Configuration Engineer', 'Configuration Engineer') ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (8,  'Content Manager',        'Content Manager')        ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (9,  'CRM',                    'CRM')                    ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (10, 'Data Analyst',           'Data Analyst')           ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (11, 'Data Scientist',         'Data Scientist')         ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (12, 'DBA',                    'DBA')                    ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (13, 'DevOps Engineer',        'DevOps Engineer')        ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (14, 'Director',               'Director')               ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (15, 'ERP Analysts',           'ERP Analysts')           ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (16, 'Front End Developer',    'Front End Developer')    ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (17, 'Full Stack Developer',   'Full Stack Developer')   ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (18, 'IVR Developer',          'IVR Developer')          ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (19, 'Mobile Developer',       'Mobile Developer')       ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (20, 'Network Admin',          'Network Admin')          ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (21, 'Operations Manager',     'Operations Manager')     ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (22, 'Product Owner',          'Product Owner')          ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (23, 'Project Manager',        'Project Manager')        ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (24, 'QA Automation',          'QA Automation')          ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (25, 'QA Manual',              'QA Manual')              ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (26, 'Scrum Master',           'Scrum Master')           ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (27, 'SDET',                   'SDET')                   ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (28, 'Software Architect',     'Software Architect')     ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (29, 'Software Delivery Manager','Software Delivery Manager') ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (30, 'Technical Leader',       'Technical Leader')       ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (31, 'Technology Specialist',  'Technology Specialist')  ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (32, 'UI/UX',                  'UI/UX')                  ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description) VALUES (33, 'Financial Analyst',      'Financial Analyst')      ON CONFLICT (rol_id) DO NOTHING;

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
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (1,  'Countries',                NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (2,  'Projects',                 NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (3,  'SupervisorAssignments',    NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (4,  'RBACRolePermissions',      NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (5,  'Regions',                  NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (6,  'Roles',                    NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (7,  'RBACPermissions',          NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (8,  'TimeOffCategories',        NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (9,  'RBACRoles',                NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (10, 'TeamMemberProjects',       NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (11, 'RBACUserRoles',            NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (12, 'TimeOffCategoriesByCountry',NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (13, 'Users',                    NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (14, 'Holidays',                 NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (15, 'TeamMembers',              NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (16, 'TimeOffStatuses',          NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (17, 'TimeOffs',                 NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (18, 'SupervisorTimeOff',        NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (19, 'RBACOptions',              NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (20, 'Notifications',            NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES (21, 'BenchMove',                NOW()) ON CONFLICT (opt_id) DO NOTHING;

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
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('BenchMove',                 true, true, false, NULL,   NOW(), 21, 1);
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
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('BenchMove',                 true, true, false, NULL,   NOW(), 21, 2);
  END IF;
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
VALUES (1, 'dev-1', :'dev_email', 'Dev', 'User', ARRAY['user', 'admin'], now(), now()) ON CONFLICT (id) DO NOTHING;

-- Assign dev user to admin security role
INSERT INTO sec.uro_user_roles (usr_id, rol_id) VALUES (1, 1) ON CONFLICT (usr_id, rol_id) DO NOTHING;

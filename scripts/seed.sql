-- ============================================================
-- Local Development Seed Data
-- Run after setup-local-db.sh to populate the database with
-- the minimum data needed to log in and use the app.
--
-- IMPORTANT: Update the email in auth_users and tbl_users
-- to match your DEV_USERNAME in .env.local
--
-- This script is idempotent — safe to run multiple times.
-- ============================================================

-- 1. Time Off Statuses
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (1, 'Tentative') ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (2, 'Acknowledge') ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (3, 'Taken') ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (4, 'Cancelled') ON CONFLICT (sta_id) DO NOTHING;
INSERT INTO ds.tbl_to_statuses (sta_id, sta_name) VALUES (5, 'Rejected') ON CONFLICT (sta_id) DO NOTHING;

-- 2. Regions
INSERT INTO ds.reg_regions (reg_id, reg_name) VALUES ('1', 'Central America') ON CONFLICT (reg_id) DO NOTHING;

-- 3. Countries (add more as needed)
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso) VALUES ('1', 'El Salvador', '1', 'SV') ON CONFLICT (cou_id) DO NOTHING;
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso) VALUES ('2', 'Guatemala', '1', 'GT') ON CONFLICT (cou_id) DO NOTHING;
INSERT INTO ds.cou_countries (cou_id, cou_name, reg_id, cou_iso) VALUES ('3', 'Mexico', '1', 'MX') ON CONFLICT (cou_id) DO NOTHING;

-- 4. Time Off Categories
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (1, 'Bench') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (2, 'Bereavement') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (3, 'Budget Constraint') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (4, 'Fixed Price') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (5, 'Holiday Swap') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (6, 'LOA') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (7, 'Marriage leave') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (8, 'Maternity Leave') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (9, 'Medical leave') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (10, 'Misc Non-Billable Time') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (11, 'Onshore days off') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (12, 'Paternity leave') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (13, 'Personal Day') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (14, 'Vacation') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (15, 'JANP') ON CONFLICT (tot_id) DO NOTHING;
INSERT INTO ds.tot_time_off_types (tot_id, tot_name) VALUES (16, 'Personal Time Off') ON CONFLICT (tot_id) DO NOTHING;

-- 5. Category x Country mappings
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('1', '1', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('3', '1', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('4', '1', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('6', '1', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('9', '1', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('10', '1', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('11', '1', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('13', '1', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('14', '1', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('1', '2', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('3', '2', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('4', '2', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('6', '2', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('9', '2', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('10', '2', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('11', '2', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('14', '2', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('1', '3', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('2', '3', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('3', '3', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('4', '3', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('15', '3', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('6', '3', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('9', '3', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('10', '3', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('16', '3', '1', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('7', '2', '1', 't', '5', 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('8', '2', '1', 't', '84', 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('8', '1', '1', 't', '112', 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('12', '2', '1', 't', '2', 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('12', '1', '1', 't', '3', 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('2', '2', '1', 't', '3', 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('2', '1', '1', 't', '1', 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('7', '1', '1', 't', '5', 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('5', '1', '0', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('5', '2', '0', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;
INSERT INTO ds.ttc_type_of_to_by_country (tot_id, cou_id, ttc_status, ttc_is_fixed_duration, ttc_fixed_days, ttc_allow_half_day, ttc_is_calendar) VALUES ('5', '3', '0', 'f', NULL, 'f', 'f') ON CONFLICT (tot_id, cou_id) DO NOTHING;

-- 6. Roles
INSERT INTO ds.tbl_roles (rol_id, rol_name, rol_description)
VALUES (1, 'admin', 'admin') ON CONFLICT (rol_id) DO NOTHING;

-- 6.1 Team Member (the dev user)
INSERT INTO ds.tbl_team_members (tms_id, tms_names, tms_surnames, tms_stadat, cou_id, tms_seniority, tms_primary_role)
VALUES (1, 'Dev', 'User', CURRENT_DATE, 1, 'Senior', 1) ON CONFLICT (tms_id) DO NOTHING;

-- 7. Application User (links to team member)
-- Email is injected automatically from DEV_USERNAME in .env.local by setup-local-db.sh
INSERT INTO ds.tbl_users (usr_id, usr_name, usr_email, usr_role, usr_stadat, tms_id)
VALUES (1, 'Dev User', :'dev_email', 'employee', CURRENT_DATE, 1) ON CONFLICT (usr_id) DO NOTHING;

-- 8. Auth User (used by dev login)
-- Email is injected automatically from DEV_USERNAME in .env.local by setup-local-db.sh
INSERT INTO sec.auth_users (id, onelogin_id, email, first_name, last_name, roles, created_at, updated_at)
VALUES (1, 'dev-1', :'dev_email', 'Dev', 'User', ARRAY['user', 'admin'], now(), now()) ON CONFLICT (id) DO NOTHING;

-- 9. Security Roles and User Role assignment
INSERT INTO sec.rol_roles (rol_id, rol_name, rol_description, created_at) VALUES (1, 'admin', 'Administrator', now()) ON CONFLICT (rol_id) DO NOTHING;
INSERT INTO sec.rol_roles (rol_id, rol_name, rol_description, created_at) VALUES (2, 'user', 'Standard user', now()) ON CONFLICT (rol_id) DO NOTHING;

INSERT INTO sec.uro_user_roles (usr_id, rol_id) VALUES (1, 1) ON CONFLICT (usr_id, rol_id) DO NOTHING;

INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('1', 'Countries', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('2', 'Projects', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('3', 'SupervisorAssignments', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('4', 'RBACRolePermissions', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('5', 'Regions', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('6', 'Roles', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('7', 'RBACPermissions', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('8', 'TimeOffCategories', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('9', 'RBACRoles', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('10', 'TeamMemberProjects', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('11', 'RBACUserRoles', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('12', 'TimeOffCategoriesByCountry', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('13', 'Users', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('14', 'Holidays', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('15', 'TeamMembers', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('16', 'TimeOffStatuses', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('17', 'TimeOffs', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('18', 'SupervisorTimeOff', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('19', 'RBACOptions', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('20', 'Notifications', NOW()) ON CONFLICT (opt_id) DO NOTHING;
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_at) VALUES ('21', 'BenchMove', NOW()) ON CONFLICT (opt_id) DO NOTHING;


-- Only insert permissions if the table is empty (no unique constraint to use ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sec.per_permissions LIMIT 1) THEN
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Countries', 't', 't', 't', 'CRUD', NOW(), '1', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Projects', 't', 't', 't', 'CRUD', NOW(), '2', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorAssignments', 't', 't', 't', 'CRUD', NOW(), '3', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACRolePermissions', 't', 't', 't', 'CRUD', NOW(), '4', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Regions', 't', 't', 't', 'CRUD', NOW(), '5', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Roles', 't', 't', 't', 'CRUD', NOW(), '6', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACPermissions', 't', 't', 't', 'CRUD', NOW(), '7', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffCategories', 't', 't', 't', 'CRUD', NOW(), '8', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACRoles', 't', 't', 't', 'CRUD', NOW(), '9', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TeamMemberProjects', 't', 't', 't', 'CRUD', NOW(), '10', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACUserRoles', 't', 't', 't', 'CRUD', NOW(), '11', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffCategoriesByCountry', 't', 't', 't', 'CRUD', NOW(), '12', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Users', 't', 't', 't', 'CRUD', NOW(), '13', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Holidays', 't', 't', 't', 'CRUD', NOW(), '14', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TeamMembers', 't', 't', 't', 'CRUD', NOW(), '15', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffStatuses', 't', 't', 't', 'CRUD', NOW(), '16', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffs', 't', 't', 't', 'CRUD', NOW(), '17', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Countries', 't', 't', 't', 'CRUD', NOW(), '1', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Projects', 't', 't', 't', 'CRUD', NOW(), '2', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorAssignments', 't', 't', 't', 'CRUD', NOW(), '3', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Regions', 't', 't', 't', 'CRUD', NOW(), '5', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffCategories', 't', 't', 't', 'CRUD', NOW(), '8', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TeamMemberProjects', 't', 't', 't', 'CRUD', NOW(), '10', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffCategoriesByCountry', 't', 't', 't', 'CRUD', NOW(), '12', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Holidays', 't', 't', 't', 'CRUD', NOW(), '14', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TeamMembers', 't', 't', 't', 'CRUD', NOW(), '15', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffStatuses', 't', 't', 't', 'CRUD', NOW(), '16', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('TimeOffs', 't', 't', 't', 'CRUD', NOW(), '17', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorTimeOff', 't', 't', 't', NULL, NOW(), '18', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACOptions', 't', 't', 't', NULL, NOW(), '19', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('SupervisorTimeOff', 't', 't', 't', NULL, NOW(), '18', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('RBACOptions', 't', 't', 't', NULL, NOW(), '19', '2');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('Notifications', 't', 't', 't', 'CRUD', NOW(), '20', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('BenchMove', 't', 't', 'f', NULL, NOW(), '21', '1');
    INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id) VALUES ('BenchMove', 't', 't', 'f', NULL, NOW(), '21', '2');
  END IF;
END $$;

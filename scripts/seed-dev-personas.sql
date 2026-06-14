-- =============================================================================
-- Dev Personas Seed Script
-- =============================================================================
-- Creates 4 test users with different RBAC profiles for local development.
-- Safe to run multiple times.
--
-- Personas:
--   admin@test.com    → admin + bsa roles + all permissions
--   bsa@test.com      → bsa role + operations/hiring/project permissions
--   manager@test.com  → supervisor role + team management permissions
--   employee@test.com → employee role + basic self-service permissions
-- =============================================================================

-- ── 1. Upsert AuthUsers ───────────────────────────────────────────────────────
-- Uses email as onelogin_id placeholder for dev-only users (won't clash with
-- real OneLogin SSO sub values). On conflict, only update name/roles — never
-- overwrite onelogin_id so real SSO users are unaffected.
INSERT INTO sec.auth_users (onelogin_id, email, first_name, last_name, roles)
VALUES ('dev-persona-admin@test.com', 'admin@test.com', 'Admin', 'User', ARRAY['user','admin','bsa'])
ON CONFLICT (email) DO UPDATE
  SET roles      = EXCLUDED.roles,
      first_name = EXCLUDED.first_name,
      last_name  = EXCLUDED.last_name,
      updated_at = NOW();

INSERT INTO sec.auth_users (onelogin_id, email, first_name, last_name, roles)
VALUES ('dev-persona-bsa@test.com', 'bsa@test.com', 'BSA', 'User', ARRAY['user','bsa'])
ON CONFLICT (email) DO UPDATE
  SET roles      = EXCLUDED.roles,
      first_name = EXCLUDED.first_name,
      last_name  = EXCLUDED.last_name,
      updated_at = NOW();

INSERT INTO sec.auth_users (onelogin_id, email, first_name, last_name, roles)
VALUES ('dev-persona-manager@test.com', 'manager@test.com', 'Manager', 'User', ARRAY['user'])
ON CONFLICT (email) DO UPDATE
  SET roles      = EXCLUDED.roles,
      first_name = EXCLUDED.first_name,
      last_name  = EXCLUDED.last_name,
      updated_at = NOW();

INSERT INTO sec.auth_users (onelogin_id, email, first_name, last_name, roles)
VALUES ('dev-persona-employee@test.com', 'employee@test.com', 'Employee', 'User', ARRAY['user'])
ON CONFLICT (email) DO UPDATE
  SET roles      = EXCLUDED.roles,
      first_name = EXCLUDED.first_name,
      last_name  = EXCLUDED.last_name,
      updated_at = NOW();

-- ── 2. Upsert SecurityRoles ───────────────────────────────────────────────────
INSERT INTO sec.rol_roles (rol_name, rol_description) VALUES
  ('admin',      'System administrator with full access'),
  ('bsa',        'Business Solutions Architect with ops access'),
  ('supervisor', 'Team supervisor with people management'),
  ('employee',   'Standard team member')
ON CONFLICT (rol_name) DO NOTHING;

-- ── 3. Link users to SecurityRoles ────────────────────────────────────────────
-- Clean slate for our test users
DELETE FROM sec.uro_user_roles
WHERE usr_id IN (
  SELECT id FROM sec.auth_users
  WHERE email IN ('admin@test.com', 'bsa@test.com', 'manager@test.com', 'employee@test.com')
);

-- admin@test.com → admin + bsa roles
INSERT INTO sec.uro_user_roles (usr_id, rol_id)
SELECT u.id, r.rol_id
FROM sec.auth_users u
CROSS JOIN sec.rol_roles r
WHERE u.email = 'admin@test.com'
  AND r.rol_name IN ('admin', 'bsa');

-- bsa@test.com → bsa role
INSERT INTO sec.uro_user_roles (usr_id, rol_id)
SELECT u.id, r.rol_id
FROM sec.auth_users u
CROSS JOIN sec.rol_roles r
WHERE u.email = 'bsa@test.com'
  AND r.rol_name = 'bsa';

-- manager@test.com → supervisor role
INSERT INTO sec.uro_user_roles (usr_id, rol_id)
SELECT u.id, r.rol_id
FROM sec.auth_users u
CROSS JOIN sec.rol_roles r
WHERE u.email = 'manager@test.com'
  AND r.rol_name = 'supervisor';

-- employee@test.com → employee role
INSERT INTO sec.uro_user_roles (usr_id, rol_id)
SELECT u.id, r.rol_id
FROM sec.auth_users u
CROSS JOIN sec.rol_roles r
WHERE u.email = 'employee@test.com'
  AND r.rol_name = 'employee';

-- ── 4. Permissions per role ───────────────────────────────────────────────────
-- Clear existing permissions for our seed roles
DELETE FROM sec.per_permissions
WHERE rol_id IN (
  SELECT rol_id FROM sec.rol_roles
  WHERE rol_name IN ('admin', 'bsa', 'supervisor', 'employee')
);

-- admin: all permissions
INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, rol_id)
SELECT resource, true, true, true, 'Admin full access: ' || resource, r.rol_id
FROM sec.rol_roles r
CROSS JOIN (VALUES
  ('MyTeam'), ('MyProfile'), ('TimeOffs'), ('TimeOffActivity'),
  ('HolidaySwaps'), ('SupervisorTimeOff'), ('SupervisorHolidaySwaps'),
  ('TimeOffReview'), ('TimeOffException'), ('HolidaySwapException'),
  ('ProjectAssignments'), ('BenchMove'), ('BenchRemove'), ('PendingRequests'),
  ('Endorsements'), ('Hiring'), ('Reports'), ('Notifications'),
  ('NotificationCenter'), ('PersistenceTables')
) AS perms(resource)
WHERE r.rol_name = 'admin';

-- bsa: all except security admin
INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, rol_id)
SELECT resource, true, true, false, 'BSA access: ' || resource, r.rol_id
FROM sec.rol_roles r
CROSS JOIN (VALUES
  ('MyTeam'), ('MyProfile'), ('TimeOffs'), ('TimeOffActivity'),
  ('HolidaySwaps'), ('SupervisorTimeOff'), ('SupervisorHolidaySwaps'),
  ('TimeOffReview'), ('TimeOffException'), ('HolidaySwapException'),
  ('ProjectAssignments'), ('BenchMove'), ('BenchRemove'), ('PendingRequests'),
  ('Endorsements'), ('Hiring'), ('Reports'), ('Notifications'),
  ('NotificationCenter'), ('PersistenceTables')
) AS perms(resource)
WHERE r.rol_name = 'bsa';

-- supervisor: team management only
INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, rol_id)
SELECT resource, true, true, false, 'Supervisor access: ' || resource, r.rol_id
FROM sec.rol_roles r
CROSS JOIN (VALUES
  ('MyTeam'), ('MyProfile'), ('TimeOffs'), ('TimeOffActivity'),
  ('HolidaySwaps'), ('SupervisorTimeOff'), ('SupervisorHolidaySwaps'),
  ('TimeOffReview'), ('PendingRequests'), ('Reports'),
  ('Notifications'), ('NotificationCenter')
) AS perms(resource)
WHERE r.rol_name = 'supervisor';

-- employee: basic self-service only
INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, rol_id)
SELECT resource, true, true, false, 'Employee access: ' || resource, r.rol_id
FROM sec.rol_roles r
CROSS JOIN (VALUES
  ('MyProfile'), ('TimeOffs'), ('TimeOffActivity'),
  ('HolidaySwaps'), ('Notifications'), ('NotificationCenter')
) AS perms(resource)
WHERE r.rol_name = 'employee';

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'Dev personas seeded successfully!' AS result;

SELECT u.email, array_agg(r.rol_name ORDER BY r.rol_name) AS security_roles
FROM sec.auth_users u
JOIN sec.uro_user_roles ur ON ur.usr_id = u.id
JOIN sec.rol_roles r ON r.rol_id = ur.rol_id
WHERE u.email IN ('admin@test.com', 'bsa@test.com', 'manager@test.com', 'employee@test.com')
GROUP BY u.email
ORDER BY u.email;

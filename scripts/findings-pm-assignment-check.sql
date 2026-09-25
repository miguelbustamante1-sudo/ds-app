-- Read-only check for production: who each project's finding review tasks will be assigned to
-- (ds.fn_resolve_finding_assignee), and whether that user can complete workflow tasks.
-- Safe to run anywhere: SELECTs only.
-- Read-only: how each project's review tasks would be assigned.
WITH pm AS (
  SELECT s.snp_entity_id                                                       AS project_id,
         s.snp_payload ->> 'project_manager'                                   AS project_manager,
         substring(s.snp_payload ->> 'project_manager' FROM '\(([0-9]+)\)\s*$') AS wdid
    FROM es.snp_entity_snapshot s
   WHERE s.snp_entity_type = 'project'
),
tm AS (
  SELECT pm.project_id, t.tms_id, t.tms_names || ' ' || t.tms_surnames AS team_member,
         t.tms_stadat, t.tms_enddat,
         (t.tms_stadat <= CURRENT_DATE AND (t.tms_enddat IS NULL OR t.tms_enddat >= CURRENT_DATE)) AS is_active
    FROM pm
    JOIN ds.tbl_team_members t ON t.wdid = pm.wdid
)
SELECT pm.project_id,
       pm.project_manager,
       pm.wdid,
       (SELECT count(*) FROM tm WHERE tm.project_id = pm.project_id)             AS team_member_rows,
       a.team_member, a.tms_stadat, a.tms_enddat, a.is_active,
       u.usr_id                                                                  AS pm_usr_id,
       u.usr_email                                                               AS pm_email,
       EXISTS (SELECT 1
                 FROM sec.auth_users au
                 JOIN sec.uro_user_roles ur ON ur.usr_id = au.id
                 JOIN sec.per_permissions p ON p.rol_id = ur.rol_id
                 LEFT JOIN sec.opt_options o ON o.opt_id = p.opt_id
                WHERE lower(au.email) = lower(u.usr_email)
                  AND coalesce(o.opt_description, p.per_resource) = 'Workflow'
                  AND p.per_write)                                               AS pm_can_complete_tasks,
       CASE WHEN pm.wdid IS NULL      THEN 'fallback: no (id) in project_manager'
            WHEN a.tms_id IS NULL     THEN 'fallback: no team member with that WDID'
            WHEN NOT a.is_active      THEN 'fallback: team member not active'
            WHEN u.usr_id IS NULL     THEN 'fallback: team member has no app user'
            ELSE 'PM' END                                                        AS assigned_to
  FROM pm
  LEFT JOIN LATERAL (SELECT * FROM tm WHERE tm.project_id = pm.project_id
                      ORDER BY tm.is_active DESC, tm.tms_stadat DESC LIMIT 1) a ON true
  LEFT JOIN LATERAL (SELECT x.usr_id, x.usr_email FROM ds.tbl_users x
                      WHERE x.tms_id = a.tms_id AND a.is_active ORDER BY x.usr_id LIMIT 1) u ON true
 ORDER BY assigned_to, pm.project_id;

-- The fallback user (you): confirms 311 and that it can complete tasks.
SELECT u.usr_id, u.usr_email,
       EXISTS (SELECT 1 FROM sec.auth_users au
                 JOIN sec.uro_user_roles ur ON ur.usr_id = au.id
                 JOIN sec.per_permissions p ON p.rol_id = ur.rol_id
                 LEFT JOIN sec.opt_options o ON o.opt_id = p.opt_id
                WHERE lower(au.email) = lower(u.usr_email)
                  AND coalesce(o.opt_description, p.per_resource) = 'Workflow' AND p.per_write) AS can_complete_tasks
  FROM ds.tbl_users u
 WHERE u.usr_id = 311 OR lower(u.usr_email) = 'milton.ayala2@telusinternational.com';

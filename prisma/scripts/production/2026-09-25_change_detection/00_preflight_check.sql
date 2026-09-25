-- ============================================================================
-- Change Detection — production deployment — 00 PRE-FLIGHT CHECK
-- Date    : 2026-09-25
-- Feature : findings (change + state rules engines), Detection Rules, Findings
--           Review Workflow (PM-assigned tasks), required_when rule type
-- Runbook : docs/technical/change-detection-production-deployment.md
-- READ-ONLY. Run first and share the result. One row per check; ok = false blocks 01_deploy.
-- ============================================================================

WITH expected(tbl, col) AS (VALUES
    ('ds.aps_approved_state', 'cde_entity_type'),
    ('ds.aps_approved_state', 'aps_entity_id'),
    ('ds.aps_approved_state', 'aps_payload'),
    ('ds.aps_approved_state', 'aps_approved_at'),
    ('ds.aps_approved_state', 'aps_approved_by'),
    ('ds.aps_approved_state', 'fnd_source_finding'),
    ('ds.cde_watched_entities', 'cde_entity_type'),
    ('ds.cde_watched_entities', 'cde_label'),
    ('ds.cde_watched_entities', 'cde_owner_email'),
    ('ds.cde_watched_entities', 'cde_completeness_pct'),
    ('ds.cde_watched_entities', 'cde_active'),
    ('ds.cde_watched_entities', 'cde_seeded_at'),
    ('ds.cde_watched_entities', 'cde_created_at'),
    ('ds.cde_watched_entities', 'cde_created_by'),
    ('ds.cde_watched_entities', 'cde_updated_by'),
    ('ds.cde_watched_entities', 'cde_updated_at'),
    ('ds.cdf_watched_fields', 'cdf_id'),
    ('ds.cdf_watched_fields', 'cde_entity_type'),
    ('ds.cdf_watched_fields', 'cdf_field_path'),
    ('ds.cdf_watched_fields', 'cdf_display_name'),
    ('ds.cdf_watched_fields', 'cdf_data_type'),
    ('ds.cdf_watched_fields', 'cdf_comparison_mode'),
    ('ds.cdf_watched_fields', 'cdf_tolerance'),
    ('ds.cdf_watched_fields', 'cdf_null_equals_empty'),
    ('ds.cdf_watched_fields', 'cdf_significance'),
    ('ds.cdf_watched_fields', 'cdf_effective_from'),
    ('ds.cdf_watched_fields', 'cdf_active'),
    ('ds.cdf_watched_fields', 'cdf_created_at'),
    ('ds.cdf_watched_fields', 'cdf_created_by'),
    ('ds.cdf_watched_fields', 'cdf_updated_by'),
    ('ds.cdf_watched_fields', 'cdf_updated_at'),
    ('ds.cev_change_events', 'cev_id'),
    ('ds.cev_change_events', 'cde_entity_type'),
    ('ds.cev_change_events', 'cev_entity_id'),
    ('ds.cev_change_events', 'pjo_id'),
    ('ds.cev_change_events', 'cev_change_type'),
    ('ds.cev_change_events', 'cdf_field_path'),
    ('ds.cev_change_events', 'cev_old_value'),
    ('ds.cev_change_events', 'cev_new_value'),
    ('ds.cev_change_events', 'cev_detected_at'),
    ('ds.fnd_findings', 'fnd_id'),
    ('ds.fnd_findings', 'fnd_fingerprint'),
    ('ds.fnd_findings', 'cde_entity_type'),
    ('ds.fnd_findings', 'fnd_entity_id'),
    ('ds.fnd_findings', 'cdf_field_path'),
    ('ds.fnd_findings', 'rul_id'),
    ('ds.fnd_findings', 'rul_version'),
    ('ds.fnd_findings', 'change_type'),
    ('ds.fnd_findings', 'old_value'),
    ('ds.fnd_findings', 'new_value'),
    ('ds.fnd_findings', 'severity'),
    ('ds.fnd_findings', 'status'),
    ('ds.fnd_findings', 'assignee'),
    ('ds.fnd_findings', 'first_seen'),
    ('ds.fnd_findings', 'last_seen'),
    ('ds.fnd_findings', 'occurrence_count'),
    ('ds.fnd_findings', 'superseded_by'),
    ('ds.fnd_findings', 'resolution'),
    ('ds.fnd_findings', 'resolved_by'),
    ('ds.fnd_findings', 'resolved_at'),
    ('ds.fnd_findings', 'win_id'),
    ('ds.fnd_findings', 'fnd_created_at'),
    ('ds.obs_observations', 'obs_id'),
    ('ds.obs_observations', 'pjo_id'),
    ('ds.obs_observations', 'cde_entity_type'),
    ('ds.obs_observations', 'obs_entity_id'),
    ('ds.obs_observations', 'obs_payload'),
    ('ds.obs_observations', 'obs_row_hash'),
    ('ds.obs_observations', 'obs_created_at'),
    ('ds.rnc_run_coverage', 'rnc_id'),
    ('ds.rnc_run_coverage', 'rnl_id'),
    ('ds.rnc_run_coverage', 'cdf_field_path'),
    ('ds.rnc_run_coverage', 'rul_id'),
    ('ds.rnc_run_coverage', 'records_evaluated'),
    ('ds.rnl_run_log', 'rnl_id'),
    ('ds.rnl_run_log', 'cde_entity_type'),
    ('ds.rnl_run_log', 'pjo_id'),
    ('ds.rnl_run_log', 'started_at'),
    ('ds.rnl_run_log', 'finished_at'),
    ('ds.rnl_run_log', 'status'),
    ('ds.rnl_run_log', 'expected_row_count'),
    ('ds.rnl_run_log', 'actual_row_count'),
    ('ds.rnl_run_log', 'completeness_result'),
    ('ds.rnl_run_log', 'override_reason'),
    ('ds.rnl_run_log', 'records_compared'),
    ('ds.rnl_run_log', 'findings_opened'),
    ('ds.rnl_run_log', 'findings_closed'),
    ('ds.rnl_run_log', 'error'),
    ('ds.rtg_routing', 'rtg_id'),
    ('ds.rtg_routing', 'cde_entity_type'),
    ('ds.rtg_routing', 'cdf_field_path'),
    ('ds.rtg_routing', 'rul_id'),
    ('ds.rtg_routing', 'rtg_assignee'),
    ('ds.rtg_routing', 'rtg_priority'),
    ('ds.rul_detection_rules', 'rul_id'),
    ('ds.rul_detection_rules', 'cde_entity_type'),
    ('ds.rul_detection_rules', 'rul_class'),
    ('ds.rul_detection_rules', 'rul_type'),
    ('ds.rul_detection_rules', 'rul_definition'),
    ('ds.rul_detection_rules', 'rul_severity'),
    ('ds.rul_detection_rules', 'rul_version'),
    ('ds.rul_detection_rules', 'rul_active'),
    ('ds.rul_detection_rules', 'rul_created_at'),
    ('ds.rul_detection_rules', 'rul_created_by'),
    ('ds.wfl_workflow_templates', 'wfl_id'),
    ('ds.wfl_workflow_templates', 'wec_id'),
    ('ds.wfl_workflow_templates', 'wfl_code'),
    ('ds.wfl_workflow_templates', 'wfl_name'),
    ('ds.wfl_workflow_templates', 'wfl_description'),
    ('ds.wfl_workflow_templates', 'wfl_version_no'),
    ('ds.wfl_workflow_templates', 'wfl_status'),
    ('ds.wfl_workflow_templates', 'wfl_is_active'),
    ('ds.wfl_workflow_templates', 'wfl_effective_from'),
    ('ds.wfl_workflow_templates', 'wfl_effective_to'),
    ('ds.wfl_workflow_templates', 'created_at'),
    ('ds.wfl_workflow_templates', 'created_by'),
    ('ds.wfl_workflow_templates', 'updated_at'),
    ('ds.wfl_workflow_templates', 'updated_by'),
    ('ds.wfl_workflow_templates', 'wfl_execution_type'),
    ('ds.wfl_workflow_templates', 'wfl_instantiate_proc_name'),
    ('ds.wtk_workflow_template_tasks', 'wtk_id'),
    ('ds.wtk_workflow_template_tasks', 'wfl_id'),
    ('ds.wtk_workflow_template_tasks', 'wtk_code'),
    ('ds.wtk_workflow_template_tasks', 'wtk_name'),
    ('ds.wtk_workflow_template_tasks', 'wtk_description'),
    ('ds.wtk_workflow_template_tasks', 'wtk_sequence_no'),
    ('ds.wtk_workflow_template_tasks', 'wtk_task_type'),
    ('ds.wtk_workflow_template_tasks', 'wtk_assignment_type'),
    ('ds.wtk_workflow_template_tasks', 'wtk_assigned_user_id'),
    ('ds.wtk_workflow_template_tasks', 'wtk_assigned_role_id'),
    ('ds.wtk_workflow_template_tasks', 'wtk_dynamic_assignment_type'),
    ('ds.wtk_workflow_template_tasks', 'wtk_priority'),
    ('ds.wtk_workflow_template_tasks', 'wtk_sla_duration_hours'),
    ('ds.wtk_workflow_template_tasks', 'wtk_escalation_user_id'),
    ('ds.wtk_workflow_template_tasks', 'wtk_escalation_role_id'),
    ('ds.wtk_workflow_template_tasks', 'wtk_escalation_dynamic_type'),
    ('ds.wtk_workflow_template_tasks', 'wtk_max_retry_count'),
    ('ds.wtk_workflow_template_tasks', 'wtk_allow_reassignment'),
    ('ds.wtk_workflow_template_tasks', 'wtk_require_comment_on_reassign'),
    ('ds.wtk_workflow_template_tasks', 'wtk_allow_fail'),
    ('ds.wtk_workflow_template_tasks', 'wtk_is_starting_task'),
    ('ds.wtk_workflow_template_tasks', 'wtk_is_active'),
    ('ds.wtk_workflow_template_tasks', 'created_at'),
    ('ds.wtk_workflow_template_tasks', 'created_by'),
    ('ds.wtk_workflow_template_tasks', 'updated_at'),
    ('ds.wtk_workflow_template_tasks', 'updated_by'),
    ('ds.wto_workflow_template_task_outcomes', 'wto_id'),
    ('ds.wto_workflow_template_task_outcomes', 'wtk_id'),
    ('ds.wto_workflow_template_task_outcomes', 'wto_code'),
    ('ds.wto_workflow_template_task_outcomes', 'wto_label'),
    ('ds.wto_workflow_template_task_outcomes', 'wto_description'),
    ('ds.wto_workflow_template_task_outcomes', 'wto_is_terminal'),
    ('ds.wto_workflow_template_task_outcomes', 'wto_triggers_outcome_action'),
    ('ds.wto_workflow_template_task_outcomes', 'created_at'),
    ('ds.wto_workflow_template_task_outcomes', 'created_by'),
    ('ds.wto_workflow_template_task_outcomes', 'wto_execution_type'),
    ('ds.wto_workflow_template_task_outcomes', 'wto_outcome_proc_name'),
    ('es.snp_entity_snapshot', 'snp_id'),
    ('es.snp_entity_snapshot', 'snp_entity_type'),
    ('es.snp_entity_snapshot', 'snp_entity_id'),
    ('es.snp_entity_snapshot', 'snp_payload'),
    ('es.snp_entity_snapshot', 'snp_loaded_at'),
    ('ds.tbl_team_members', 'tms_id'), ('ds.tbl_team_members', 'wdid'),
    ('ds.tbl_team_members', 'tms_stadat'), ('ds.tbl_team_members', 'tms_enddat'),
    ('ds.tbl_users', 'usr_id'), ('ds.tbl_users', 'tms_id'), ('ds.tbl_users', 'usr_email'),
    ('ds.win_workflow_instances', 'win_id'), ('ds.wit_workflow_instance_tasks', 'wit_id'),
    ('ds.wic_workflow_instance_context', 'wic_value_json'), ('ds.wal_workflow_audit_log', 'wal_old_state'),
    ('com.ntf_notifications', 'ntf_id'), ('com.rec_recipients', 'usr_id'),
    ('di.pte_persistence_templates', 'pte_target_table'), ('di.ptc_persistence_template_columns', 'ptc_csv_column_name'),
    ('sec.opt_options', 'opt_description'), ('sec.per_permissions', 'per_resource'), ('sec.rol_roles', 'rol_name')
),
engine(fn, args) AS (VALUES
    ('ds.sp_engine_create_instance', 'p_wfl_id uuid, p_business_reference_type text, p_business_reference_id text, p_owner_user_id integer, p_started_by text, p_created_by text, p_context jsonb'),
    ('ds.sp_engine_insert_task', 'p_win_id uuid, p_wtk_code character varying, p_assignee_user_id integer, p_performed_by text, p_created_by text'),
    ('ds.sp_engine_complete_instance_if_done', 'p_win_id uuid, p_wit_id uuid, p_route_found boolean, p_performed_by text, p_performed_by_user_id text'),
    ('com.sp_notify_user', 'p_user_id integer, p_item_type text, p_payload jsonb, p_category_name text, p_action_type text, p_created_by text')
),
present_cols AS (
  SELECT table_schema || '.' || table_name AS tbl, column_name AS col FROM information_schema.columns
),
checks AS (
  -- Blocking: PostgreSQL 15+ (the unique index uses NULLS NOT DISTINCT).
  SELECT 1 AS ord, 'blocking' AS kind, 'PostgreSQL version >= 15' AS item,
         current_setting('server_version_num')::int >= 150000 AS ok, current_setting('server_version') AS detail
  UNION ALL
  -- Blocking: every table/column the feature reads or writes.
  SELECT 2, 'blocking', 'missing table: ' || e.tbl, false, 'create from prisma/schema.prisma (DB team)'
    FROM (SELECT DISTINCT tbl FROM expected) e
   WHERE NOT EXISTS (SELECT 1 FROM present_cols p WHERE p.tbl = e.tbl)
  UNION ALL
  SELECT 3, 'blocking', 'missing column: ' || e.tbl || '.' || e.col, false, 'add from prisma/schema.prisma (DB team)'
    FROM expected e
   WHERE EXISTS (SELECT 1 FROM present_cols p WHERE p.tbl = e.tbl)
     AND NOT EXISTS (SELECT 1 FROM present_cols p WHERE p.tbl = e.tbl AND p.col = e.col)
  UNION ALL
  SELECT 4, 'blocking', 'all expected tables and columns present',
         NOT EXISTS (SELECT 1 FROM expected e WHERE NOT EXISTS (SELECT 1 FROM present_cols p WHERE p.tbl = e.tbl AND p.col = e.col)),
         (SELECT count(*) FROM expected)::text || ' columns checked'
  UNION ALL
  -- Blocking: workflow engine primitives (owned by the engine team, never deployed by this bundle).
  SELECT 5, 'blocking', 'engine primitive: ' || e.fn,
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname || '.' || p.proname = e.fn AND pg_get_function_identity_arguments(p.oid) = e.args),
         e.args
    FROM engine e
  UNION ALL
  -- Informational: what 01_deploy will create or replace.
  SELECT 6, 'info', 'function ' || f.fn,
         true,
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname || '.' || p.proname = f.fn)
              THEN 'exists — will be replaced' ELSE 'absent — will be created' END
    FROM (VALUES ('ds.fn_run_state_rules'), ('ds.fn_resolve_finding_assignee'), ('ds.sp_start_finding_review_workflow'),
                 ('ds.sp_handle_finding_outcome'), ('ds.fn_create_finding_tasks'), ('ds.fn_close_resolved_finding_tasks')) f(fn)
  UNION ALL
  SELECT 7, 'info', 'index ds.uq_fnd_open_entity_field', true,
         coalesce((SELECT indexdef FROM pg_indexes WHERE schemaname = 'ds' AND indexname = 'uq_fnd_open_entity_field'),
                  'absent — will be created')
  UNION ALL
  SELECT 7, 'info', 'old index ds.uq_fnd_open_fingerprint', true,
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'ds' AND indexname = 'uq_fnd_open_fingerprint')
              THEN 'exists — will be DROPPED (superseded)' ELSE 'absent' END
  UNION ALL
  SELECT 8, 'info', 'workflow template ' || c.code, true,
         coalesce((SELECT string_agg(wfl_status || ' v' || wfl_version_no, ', ') FROM ds.wfl_workflow_templates WHERE wfl_code = c.code),
                  'absent — will be created PUBLISHED')
    FROM (VALUES ('FINDING_CHANGE_REVIEW'), ('FINDING_RULE_REVIEW')) c(code)
  UNION ALL
  SELECT 9, 'info', 'RBAC option ' || o.name, true,
         coalesce((SELECT 'exists as opt_id ' || opt_id FROM sec.opt_options WHERE opt_description = o.name),
                  CASE WHEN o.name = 'Workflow' THEN 'MISSING — tasks cannot be completed by anyone' ELSE 'absent — will be created' END)
    FROM (VALUES ('Findings'), ('WatchedFields'), ('Workflow')) o(name)
  UNION ALL
  SELECT 10, 'info', 'role ' || r.rol_name || ' (rol_id ' || r.rol_id || ')', true,
         'Workflow write: ' || EXISTS (SELECT 1 FROM sec.per_permissions p LEFT JOIN sec.opt_options o ON o.opt_id = p.opt_id
                                        WHERE p.rol_id = r.rol_id AND coalesce(o.opt_description, p.per_resource) = 'Workflow' AND p.per_write)
         || ' · Findings: ' || EXISTS (SELECT 1 FROM sec.per_permissions p LEFT JOIN sec.opt_options o ON o.opt_id = p.opt_id
                                        WHERE p.rol_id = r.rol_id AND coalesce(o.opt_description, p.per_resource) = 'Findings')
    FROM sec.rol_roles r
  UNION ALL
  SELECT 11, 'info', 'snapshot upload template (di.pte_persistence_templates → es.snp_entity_snapshot)', true,
         CASE WHEN EXISTS (SELECT 1 FROM di.pte_persistence_templates WHERE pte_target_table = 'es.snp_entity_snapshot')
              THEN 'exists — kept as is' ELSE 'absent — will be created' END
  UNION ALL
  SELECT 12, 'info', 'fallback reviewer milton.ayala2@telusinternational.com', true,
         coalesce((SELECT 'usr_id ' || string_agg(usr_id::text, ', ') FROM ds.tbl_users
                    WHERE lower(usr_email) = 'milton.ayala2@telusinternational.com'), 'NOT FOUND — fallback would use hard-coded 311')
  UNION ALL
  -- Counted dynamically so a missing table reports 'table missing' instead of failing the whole check.
  SELECT 13, 'info', 'existing rows in ' || d.tbl, true,
         CASE WHEN to_regclass(d.tbl) IS NULL THEN 'table missing'
              ELSE (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %s', d.tbl), false, true, '')))[1]::text
         END
    FROM (VALUES ('ds.cde_watched_entities'), ('ds.cdf_watched_fields'), ('ds.rul_detection_rules'),
                 ('ds.aps_approved_state'), ('ds.fnd_findings'), ('es.snp_entity_snapshot')) d(tbl)
)
SELECT kind, item, ok, detail FROM checks ORDER BY ord, item;

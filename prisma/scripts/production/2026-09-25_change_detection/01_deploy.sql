-- ============================================================================
-- Change Detection — production deployment — 01 DEPLOY
-- Date    : 2026-09-25
-- Feature : findings (change + state rules engines), Detection Rules, Findings
--           Review Workflow (PM-assigned tasks), required_when rule type
-- Runbook : docs/technical/change-detection-production-deployment.md
-- Run as ONE transaction, after 00 shows no ok = false. Idempotent: safe to re-run. Contains DROP INDEX (step 2).
-- ============================================================================

BEGIN;

-- ── 1. Guard: stop before changing anything if a dependency is missing ────
DO $guard$
DECLARE
  v_missing text;
BEGIN
  IF current_setting('server_version_num')::int < 150000 THEN
    RAISE EXCEPTION 'PostgreSQL 15+ required (NULLS NOT DISTINCT); this server is %', current_setting('server_version');
  END IF;

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
)
  SELECT string_agg(e.tbl || '.' || e.col, ', ') INTO v_missing
    FROM expected e
   WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c
                      WHERE c.table_schema || '.' || c.table_name = e.tbl AND c.column_name = e.col);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing tables/columns — run 00_preflight_check.sql and create them from prisma/schema.prisma first: %', v_missing;
  END IF;

  SELECT string_agg(e.fn, ', ') INTO v_missing
    FROM (VALUES
    ('ds.sp_engine_create_instance', 'p_wfl_id uuid, p_business_reference_type text, p_business_reference_id text, p_owner_user_id integer, p_started_by text, p_created_by text, p_context jsonb'),
    ('ds.sp_engine_insert_task', 'p_win_id uuid, p_wtk_code character varying, p_assignee_user_id integer, p_performed_by text, p_created_by text'),
    ('ds.sp_engine_complete_instance_if_done', 'p_win_id uuid, p_wit_id uuid, p_route_found boolean, p_performed_by text, p_performed_by_user_id text'),
    ('com.sp_notify_user', 'p_user_id integer, p_item_type text, p_payload jsonb, p_category_name text, p_action_type text, p_created_by text')
         ) e(fn, args)
   WHERE NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                      WHERE n.nspname || '.' || p.proname = e.fn AND pg_get_function_identity_arguments(p.oid) = e.args);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Workflow engine primitives missing or with a different signature: % (owned by the engine team; see prisma/scripts/workflow_engine_primitives.sql)', v_missing;
  END IF;
END
$guard$;


-- ── 2. One live finding per (entity, field, rule) ───────────────────────────
-- Replaces the superseded fingerprint index, and re-keys uq_fnd_open_entity_field
-- to include rul_id and the 'acknowledged' status. DROP + CREATE in this transaction.
DROP INDEX IF EXISTS ds.uq_fnd_open_fingerprint;
DROP INDEX IF EXISTS ds.uq_fnd_open_entity_field;
CREATE UNIQUE INDEX uq_fnd_open_entity_field
    ON ds.fnd_findings (cde_entity_type, fnd_entity_id, cdf_field_path, rul_id)
    NULLS NOT DISTINCT
    WHERE status IN ('open', 'acknowledged');


-- ── 3. Watched-field CHECK constraints (Object & Field Manager) ─────────────
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
      ADD CONSTRAINT chk_cdf_significance CHECK (cdf_significance IN ('material', 'informational'));
  END IF;
END
$$;


-- ── 4. State rules engine (source: prisma/scripts/fn_run_state_rules.sql) ───
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


-- ── 5. Findings Review Workflow procedures (source: prisma/scripts/findings_review_workflow.sql)
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


-- ── 6. Workflow templates (source: prisma/scripts/findings_review_templates.sql)
-- Must come after step 5: the templates name the procedures above.
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


-- ── 7. Snapshot upload template (TSV → es.snp_entity_snapshot) — only if absent
WITH new_template AS (
    INSERT INTO di.pte_persistence_templates (
        pte_id, pte_name, pte_description, pte_enabled, pte_has_csv_header,
        pte_separator, pte_truncate_before_import, pte_error_handling_strategy,
        pte_duplicates_handling_strategy, pte_target_table, pte_created_by, pte_created_at
    )
    -- The aggregate sits in a subquery: at top level it would return a row even when the
    -- WHERE filters everything out, and a re-run would try to insert again.
    SELECT m.next_id,
           'Entity Snapshot',
           'Change-detection snapshot load. jsonb payload column — source files must be RFC-4180-quoted on the payload field.',
           true, true, E'\t', true, 'STOP_ON_FIRST_ERROR_AND_ROLLBACK', 'INSERT',
           'es.snp_entity_snapshot', 'system:deploy', now()
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
    (0, 'snp_entity_type', 'text',  NULL::int, false, NULL::text, 'entity_type', -1),
    (1, 'snp_entity_id',   'text',  NULL::int, false, NULL::text, 'entity_id',   -1),
    (2, 'snp_payload',     'jsonb', NULL::int, false, NULL::text, 'payload',     -1)
 ) AS v(ptc_index, ptc_name, ptc_type, ptc_length, ptc_allow_null, ptc_comment, ptc_csv_column_name, ptc_csv_column_index);


-- ── 8. Screen permissions: options + admin-role grants (other roles: see runbook)
-- Options are matched by description, never by a fixed opt_id (ids differ per environment).
INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at)
SELECT (SELECT coalesce(max(opt_id), 0) + 1 FROM sec.opt_options), 'Findings', 'system:deploy', now()
 WHERE NOT EXISTS (SELECT 1 FROM sec.opt_options WHERE opt_description = 'Findings');

INSERT INTO sec.opt_options (opt_id, opt_description, opt_created_by, opt_created_at)
SELECT (SELECT coalesce(max(opt_id), 0) + 1 FROM sec.opt_options), 'WatchedFields', 'system:deploy', now()
 WHERE NOT EXISTS (SELECT 1 FROM sec.opt_options WHERE opt_description = 'WatchedFields');

-- Keep the opt_id sequence ahead of the explicit ids above.
SELECT setval(pg_get_serial_sequence('sec.opt_options', 'opt_id'), (SELECT max(opt_id) FROM sec.opt_options))
 WHERE pg_get_serial_sequence('sec.opt_options', 'opt_id') IS NOT NULL;

INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, updated_at, opt_id, rol_id)
SELECT o.opt_description, true, true, true, NULL, now(), o.opt_id, r.rol_id
  FROM sec.opt_options o
 CROSS JOIN sec.rol_roles r
 WHERE o.opt_description IN ('Findings', 'WatchedFields')
   AND r.rol_name = 'admin'
   AND NOT EXISTS (SELECT 1 FROM sec.per_permissions p WHERE p.opt_id = o.opt_id AND p.rol_id = r.rol_id);

COMMIT;

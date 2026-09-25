-- ============================================================================
-- Purpose : Tracked source for the workflow engine's shared DATABASE-execution-
--           type primitives and the in-app notification primitive
-- Date    : 2026-09-23
-- Source  : Captured verbatim from the production database with
--           pg_get_functiondef(). These functions existed only in live
--           databases — no script for them was in version control
--           (documents/db-handoffs/2026-09-18_workflow_database_native_execution_type_procedures.sql
--           is referenced by other handoffs but is not in this repository).
-- Owner   : Workflow engine / DB team. This file is a snapshot for local
--           environments and for review — do not edit these bodies here;
--           changes belong to the engine's owners.
-- Tables  : ds.win_workflow_instances, ds.wit_workflow_instance_tasks,
--           ds.wic_workflow_instance_context, ds.wal_workflow_audit_log,
--           ds.wnt_workflow_instance_notifications, com.ntf_notifications,
--           com.rec_recipients (all created by prisma db push)
-- ============================================================================

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

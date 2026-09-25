-- ============================================================================
-- Purpose : Findings Review Workflow templates as data — FINDING_CHANGE_REVIEW and
--           FINDING_RULE_REVIEW, their tasks and outcomes, PUBLISHED.
-- Date    : 2026-09-25
-- Tables  : ds.wfl_workflow_templates, ds.wtk_workflow_template_tasks,
--           ds.wto_workflow_template_task_outcomes
-- Source  : Generated from the rows the workflow admin API created and published
--           locally (scripts/create-finding-review-templates.py), so every value
--           already passed the app's publish validation (DATABASE execution type,
--           CONTEXT assignment, proc names present). Row ids are fixed so every
--           environment gets the same template, task and outcome ids.
-- Depends : ds.sp_start_finding_review_workflow and ds.sp_handle_finding_outcome
--           must exist (prisma/scripts/findings_review_workflow.sql).
-- Idempotent: each template is skipped when a PUBLISHED version of its code
--           already exists; individual rows use ON CONFLICT (id) DO NOTHING.
-- ============================================================================

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

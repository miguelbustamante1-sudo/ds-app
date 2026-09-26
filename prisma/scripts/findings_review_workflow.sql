-- ============================================================================
-- Purpose : Findings Review Workflow — one review task per finding, created and
--           closed by the "Run Findings" / "Run Rules" buttons (no trigger, no
--           background job).
-- Date    : 2026-09-23
-- Tables  : ds.fnd_findings (index + win_id/status writes), ds.aps_approved_state
--           (baseline advance on Agree); workflow tables only through the engine
--           primitives, except fn_close_resolved_finding_tasks (see its header).
-- Depends : prisma/scripts/workflow_engine_primitives.sql (sp_engine_*,
--           com.sp_notify_user) and the two templates FINDING_CHANGE_REVIEW /
--           FINDING_RULE_REVIEW, PUBLISHED. Without a published template the
--           start procedure returns quietly and no task is created.
--
-- Finding lifecycle (status):
--   open ──Agree──────────────▶ approved            (baseline advanced, task done)
--   open ──Disagree/Mark resolved──▶ acknowledged   (follow-up "awaiting" task)
--   open ──value fixed by snapshot──▶ self_resolved (task closed by the run)
--   acknowledged ──value fixed──▶ resolved_confirmed (follow-up closed by the run)
--   acknowledged ──Agree (from follow-up)──▶ approved
--   acknowledged ──Dismiss (rule follow-up)──▶ dismissed
--   open/acknowledged ──value moved again──▶ superseded (change engine)
--   open/acknowledged ──rule turned off──▶ rule_retired (Detection Rules screen)
--
-- 'acknowledged' is a LIVE status: both engines keep evaluating it, and the
-- unique index below covers it, so an acknowledged finding recurs instead of
-- being duplicated (which would also duplicate its task).
-- ============================================================================


-- ── 1. One live finding per (entity, field, rule) — now including acknowledged
BEGIN;
DROP INDEX IF EXISTS ds.uq_fnd_open_entity_field;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fnd_open_entity_field
    ON ds.fnd_findings (cde_entity_type, fnd_entity_id, cdf_field_path, rul_id)
    NULLS NOT DISTINCT
    WHERE status IN ('open', 'acknowledged');
COMMIT;


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

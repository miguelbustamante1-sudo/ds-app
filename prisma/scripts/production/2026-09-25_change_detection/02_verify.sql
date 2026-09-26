-- ============================================================================
-- Change Detection — production deployment — 02 POST-DEPLOY VERIFICATION
-- Date    : 2026-09-25
-- Feature : findings (change + state rules engines), Detection Rules, Findings
--           Review Workflow (PM-assigned tasks), required_when rule type
-- Runbook : docs/technical/change-detection-production-deployment.md
-- READ-ONLY. Run after 01_deploy. Every row should show ok = true.
-- ============================================================================

SELECT item, ok, detail FROM (
  SELECT 1 AS ord, 'functions deployed (6)' AS item,
         count(*) = 6 AS ok, string_agg(p.proname, ', ' ORDER BY p.proname) AS detail
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'ds' AND p.proname IN ('fn_run_state_rules', 'fn_resolve_finding_assignee', 'sp_start_finding_review_workflow',
                                            'sp_handle_finding_outcome', 'fn_create_finding_tasks', 'fn_close_resolved_finding_tasks')
  UNION ALL
  SELECT 2, 'unique index covers rul_id + acknowledged',
         coalesce(indexdef LIKE '%rul_id%' AND indexdef LIKE '%acknowledged%', false), coalesce(indexdef, 'MISSING')
    FROM (SELECT (SELECT indexdef FROM pg_indexes WHERE schemaname = 'ds' AND indexname = 'uq_fnd_open_entity_field') AS indexdef) i
  UNION ALL
  SELECT 3, 'old fingerprint index gone',
         NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'ds' AND indexname = 'uq_fnd_open_fingerprint'), ''
  UNION ALL
  SELECT 4, 'template ' || c.code || ' PUBLISHED, 2 tasks, ' || c.outcomes || ' outcomes',
         EXISTS (SELECT 1 FROM ds.wfl_workflow_templates w
                  WHERE w.wfl_code = c.code AND w.wfl_status = 'PUBLISHED'
                    AND (SELECT count(*) FROM ds.wtk_workflow_template_tasks k WHERE k.wfl_id = w.wfl_id) = 2
                    AND (SELECT count(*) FROM ds.wto_workflow_template_task_outcomes o
                           JOIN ds.wtk_workflow_template_tasks k USING (wtk_id) WHERE k.wfl_id = w.wfl_id) = c.outcomes),
         ''
    FROM (VALUES ('FINDING_CHANGE_REVIEW', 3), ('FINDING_RULE_REVIEW', 2)) c(code, outcomes)
  UNION ALL
  SELECT 5, 'snapshot upload template present',
         EXISTS (SELECT 1 FROM di.pte_persistence_templates WHERE pte_target_table = 'es.snp_entity_snapshot'), ''
  UNION ALL
  SELECT 6, 'admin role granted ' || o.name,
         EXISTS (SELECT 1 FROM sec.per_permissions p JOIN sec.opt_options x ON x.opt_id = p.opt_id
                   JOIN sec.rol_roles r ON r.rol_id = p.rol_id
                  WHERE x.opt_description = o.name AND r.rol_name = 'admin' AND p.per_read AND p.per_write), ''
    FROM (VALUES ('Findings'), ('WatchedFields')) o(name)
  UNION ALL
  -- Read-only function call: an entity with no snapshot or baseline always resolves to the fallback reviewer.
  SELECT 7, 'fallback reviewer resolves to 311', ds.fn_resolve_finding_assignee('verify', 'verify') = 311,
         'resolved usr_id ' || ds.fn_resolve_finding_assignee('verify', 'verify')
  UNION ALL
  SELECT 8, 'change-detection tables start blank (no findings, rules, baselines, watched fields)',
         (SELECT count(*) FROM ds.fnd_findings) = 0 AND (SELECT count(*) FROM ds.rul_detection_rules) = 0
         AND (SELECT count(*) FROM ds.aps_approved_state) = 0 AND (SELECT count(*) FROM ds.cdf_watched_fields) = 0,
         'informational — false just means data already exists'
) v ORDER BY ord, item;

-- Workflows: plantilla de aprobacion simple + instancia de ejemplo
-- Idempotente: guards por wfl_code y wfl_id

-- Plantilla: Aprobacion de Time Off Especial
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.wfl_workflow_templates WHERE wfl_code = 'TIMEOFF_SPECIAL_APPROVAL') THEN
    INSERT INTO ds.wfl_workflow_templates(wfl_id, wfl_code, wfl_name, wfl_description, wfl_version_no, wfl_status, wfl_is_active, wfl_effective_from, created_at, created_by)
    VALUES (
      gen_random_uuid(),
      'TIMEOFF_SPECIAL_APPROVAL',
      'Aprobacion de Time Off Especial',
      'Flujo de aprobacion para solicitudes de tiempo libre que requieren aprobacion del supervisor y RRHH.',
      1, 'PUBLISHED', TRUE, '2026-01-01', NOW(), 'seed'
    );
  END IF;
END $$;

-- Tarea 1: Revision del supervisor
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.wtk_workflow_template_tasks
    WHERE wfl_id = (SELECT wfl_id FROM ds.wfl_workflow_templates WHERE wfl_code = 'TIMEOFF_SPECIAL_APPROVAL')
      AND wtk_code = 'SUPERVISOR_REVIEW'
  ) THEN
    INSERT INTO ds.wtk_workflow_template_tasks(
      wtk_id, wfl_id, wtk_code, wtk_name, wtk_description,
      wtk_sequence_no, wtk_task_type, wtk_assignment_type, wtk_dynamic_assignment_type,
      wtk_priority, wtk_max_retry_count, wtk_allow_reassignment,
      wtk_require_comment_on_reassign, wtk_allow_fail, wtk_is_starting_task, wtk_is_active, created_at
    )
    VALUES (
      gen_random_uuid(),
      (SELECT wfl_id FROM ds.wfl_workflow_templates WHERE wfl_code = 'TIMEOFF_SPECIAL_APPROVAL'),
      'SUPERVISOR_REVIEW', 'Revision del Supervisor',
      'El supervisor directo revisa y aprueba o rechaza la solicitud.',
      1, 'APPROVAL', 'DYNAMIC', 'SUPERVISOR',
      'MEDIUM', 0, TRUE, TRUE, FALSE, TRUE, TRUE, NOW()
    );
  END IF;
END $$;

-- Tarea 2: Aprobacion de RRHH
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.wtk_workflow_template_tasks
    WHERE wfl_id = (SELECT wfl_id FROM ds.wfl_workflow_templates WHERE wfl_code = 'TIMEOFF_SPECIAL_APPROVAL')
      AND wtk_code = 'HR_APPROVAL'
  ) THEN
    INSERT INTO ds.wtk_workflow_template_tasks(
      wtk_id, wfl_id, wtk_code, wtk_name, wtk_description,
      wtk_sequence_no, wtk_task_type, wtk_assignment_type,
      wtk_priority, wtk_max_retry_count, wtk_allow_reassignment,
      wtk_require_comment_on_reassign, wtk_allow_fail, wtk_is_starting_task, wtk_is_active, created_at
    )
    VALUES (
      gen_random_uuid(),
      (SELECT wfl_id FROM ds.wfl_workflow_templates WHERE wfl_code = 'TIMEOFF_SPECIAL_APPROVAL'),
      'HR_APPROVAL', 'Aprobacion de RRHH',
      'El equipo de RRHH valida la solicitud antes de la aprobacion final.',
      2, 'APPROVAL', 'ROLE',
      'HIGH', 0, TRUE, TRUE, FALSE, FALSE, TRUE, NOW()
    );
  END IF;
END $$;

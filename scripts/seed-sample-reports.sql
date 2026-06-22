-- Report Definitions con parametros de ejemplo
-- Idempotente: guards por rpt_name

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.rpt_report_definitions WHERE rpt_name = 'Time Off por Periodo') THEN
    INSERT INTO ds.rpt_report_definitions(rpt_name, rpt_description, rpt_group, rpt_sql_query, rpt_active, rpt_created_by)
    VALUES (
      'Time Off por Periodo',
      'Lista de solicitudes de tiempo libre dentro de un rango de fechas.',
      'Time Off',
      'SELECT t.tto_id, m.tms_name, t.tto_stadat, t.tto_enddat, s.sta_name FROM ds.tbl_tms_time_off t JOIN ds.tbl_team_members m ON m.tms_id = t.tms_id JOIN ds.tbl_to_statuses s ON s.sta_id = t.sta_id WHERE t.tto_stadat BETWEEN :start_date AND :end_date ORDER BY t.tto_stadat',
      TRUE, 'seed'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.rpt_report_definitions WHERE rpt_name = 'Asignaciones de Proyecto Activas') THEN
    INSERT INTO ds.rpt_report_definitions(rpt_name, rpt_description, rpt_group, rpt_sql_query, rpt_active, rpt_created_by)
    VALUES (
      'Asignaciones de Proyecto Activas',
      'TMs actualmente asignados a proyectos con fechas vigentes.',
      'Proyectos',
      'SELECT m.tms_name, p.pro_name, a.tmp_start_date, a.tmp_end_date, a.tmp_allocation FROM ds.tmp_team_member_project a JOIN ds.tbl_team_members m ON m.tms_id = a.tms_id JOIN ds.pro_projects p ON p.pro_id = a.pro_id WHERE a.tmp_deleted = FALSE AND a.tmp_end_date >= CURRENT_DATE ORDER BY p.pro_name, m.tms_name',
      TRUE, 'seed'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.rpt_report_definitions WHERE rpt_name = 'Compensatorio Pendiente') THEN
    INSERT INTO ds.rpt_report_definitions(rpt_name, rpt_description, rpt_group, rpt_sql_query, rpt_active, rpt_created_by)
    VALUES (
      'Compensatorio Pendiente',
      'Solicitudes de tiempo compensatorio en estado pendiente de aprobacion.',
      'Compensatorio',
      'SELECT m.tms_name, c.ct_starting_time, c.ct_ending_time, c.ct_type FROM ds.ct_compensatory_time c JOIN ds.tbl_team_members m ON m.tms_id = c.tms_id WHERE c.ct_status = ''Submitted'' ORDER BY c.ct_starting_time',
      TRUE, 'seed'
    );
  END IF;
END $$;

-- Parametros para el reporte "Time Off por Periodo"
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.rtp_report_parameters
    WHERE rpt_id = (SELECT rpt_id FROM ds.rpt_report_definitions WHERE rpt_name = 'Time Off por Periodo')
      AND rtp_name = 'start_date'
  ) THEN
    INSERT INTO ds.rtp_report_parameters(rpt_id, rtp_name, rtp_label, rtp_type, rtp_required, rtp_order)
    VALUES (
      (SELECT rpt_id FROM ds.rpt_report_definitions WHERE rpt_name = 'Time Off por Periodo'),
      'start_date', 'Fecha Inicio', 'date', TRUE, 1
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.rtp_report_parameters
    WHERE rpt_id = (SELECT rpt_id FROM ds.rpt_report_definitions WHERE rpt_name = 'Time Off por Periodo')
      AND rtp_name = 'end_date'
  ) THEN
    INSERT INTO ds.rtp_report_parameters(rpt_id, rtp_name, rtp_label, rtp_type, rtp_required, rtp_order)
    VALUES (
      (SELECT rpt_id FROM ds.rpt_report_definitions WHERE rpt_name = 'Time Off por Periodo'),
      'end_date', 'Fecha Fin', 'date', TRUE, 2
    );
  END IF;
END $$;

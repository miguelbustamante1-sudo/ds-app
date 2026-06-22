-- Corporate Phone Lines y Assignments
-- Idempotente: guards por numero de telefono y (cpl_id, tms_id, cpa_assign_date_start)

-- Lineas telefonicas (3 por pais)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cpl_corporate_phone_lines WHERE cpl_phone_number = '+503-7000-0001') THEN
    INSERT INTO ds.cpl_corporate_phone_lines(cpl_phone_number, cpl_contract_start_date, cou_id, cpl_actual_cost_rate, usr_id_created_by)
    VALUES ('+503-7000-0001', '2026-01-01', 1, 15.00, 1);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cpl_corporate_phone_lines WHERE cpl_phone_number = '+503-7000-0002') THEN
    INSERT INTO ds.cpl_corporate_phone_lines(cpl_phone_number, cpl_contract_start_date, cpl_contract_end_date, cou_id, cpl_actual_cost_rate, usr_id_created_by)
    VALUES ('+503-7000-0002', '2025-06-01', '2026-05-31', 1, 15.00, 1);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cpl_corporate_phone_lines WHERE cpl_phone_number = '+502-5000-0001') THEN
    INSERT INTO ds.cpl_corporate_phone_lines(cpl_phone_number, cpl_contract_start_date, cou_id, cpl_actual_cost_rate, usr_id_created_by)
    VALUES ('+502-5000-0001', '2026-01-01', 2, 12.00, 1);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cpl_corporate_phone_lines WHERE cpl_phone_number = '+52-55-0000-0001') THEN
    INSERT INTO ds.cpl_corporate_phone_lines(cpl_phone_number, cpl_contract_start_date, cou_id, cpl_actual_cost_rate, usr_id_created_by)
    VALUES ('+52-55-0000-0001', '2026-01-01', 3, 18.00, 1);
  END IF;
END $$;

-- Asignaciones a TMs ficticios
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 500)
  AND NOT EXISTS (
    SELECT 1 FROM ds.cpa_corporate_phone_assignments
    WHERE cpl_id = (SELECT cpl_id FROM ds.cpl_corporate_phone_lines WHERE cpl_phone_number = '+503-7000-0001')
      AND tms_id = 500 AND cpa_assign_date_start = '2026-01-01'
  ) THEN
    INSERT INTO ds.cpa_corporate_phone_assignments(cpl_id, tms_id, cpa_bill_rate, cpa_assign_date_start, cpa_billable, usr_id_created_by)
    VALUES (
      (SELECT cpl_id FROM ds.cpl_corporate_phone_lines WHERE cpl_phone_number = '+503-7000-0001'),
      500, 15.00, '2026-01-01', TRUE, 1
    );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 502)
  AND NOT EXISTS (
    SELECT 1 FROM ds.cpa_corporate_phone_assignments
    WHERE cpl_id = (SELECT cpl_id FROM ds.cpl_corporate_phone_lines WHERE cpl_phone_number = '+502-5000-0001')
      AND tms_id = 502 AND cpa_assign_date_start = '2026-02-01'
  ) THEN
    INSERT INTO ds.cpa_corporate_phone_assignments(cpl_id, tms_id, cpa_bill_rate, cpa_assign_date_start, cpa_billable, usr_id_created_by)
    VALUES (
      (SELECT cpl_id FROM ds.cpl_corporate_phone_lines WHERE cpl_phone_number = '+502-5000-0001'),
      502, 12.00, '2026-02-01', TRUE, 1
    );
  END IF;
END $$;

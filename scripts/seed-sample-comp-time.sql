-- ============================================================
-- Sample data: Compensatory Time (ds.ct_compensatory_time)
-- Statuses:  SUBMITTED | APPROVED | REJECTED
-- Types:     EARNED    | USED
-- References:
--   tms_id 500-509 (fictional TMs always seeded)
--   pro_id 100-104 (dev projects always seeded)
--   ct_created_by = dev user email (read from ds.tbl_users)
-- Idempotency: guarded by (tms_id, ct_starting_time)
-- ============================================================

DO $$
DECLARE v_email TEXT;
BEGIN
  SELECT usr_email INTO v_email FROM ds.tbl_users WHERE usr_id = 1;

  -- ── SUBMITTED / EARNED ───────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 500 AND ct_starting_time = '2026-06-07 20:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (500, 100, 'Soporte de emergencia producción', '2026-06-07 20:00:00+00', '2026-06-08 02:00:00+00', 'SUBMITTED', 'EARNED', 0, 6, 6, v_email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 501 AND ct_starting_time = '2026-06-14 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (501, 101, 'Entrega de hito crítico fin de semana', '2026-06-14 08:00:00+00', '2026-06-14 17:00:00+00', 'SUBMITTED', 'EARNED', 8, 0, 8, v_email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 502 AND ct_starting_time = '2026-05-31 19:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (502, 102, 'Migración de base de datos nocturna', '2026-05-31 19:00:00+00', '2026-06-01 01:00:00+00', 'SUBMITTED', 'EARNED', 0, 6, 6, v_email);
  END IF;

  -- ── SUBMITTED / USED ─────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 503 AND ct_starting_time = '2026-06-20 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (503, 103, 'Uso de compensatorio acumulado', '2026-06-20 08:00:00+00', '2026-06-20 17:00:00+00', 'SUBMITTED', 'USED', 8, 0, 8, v_email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 504 AND ct_starting_time = '2026-07-04 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (504, 104, 'Día libre por compensatorio', '2026-07-04 08:00:00+00', '2026-07-04 17:00:00+00', 'SUBMITTED', 'USED', 8, 0, 8, v_email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 505 AND ct_starting_time = '2026-07-11 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (505, 100, 'Tarde libre compensatorio', '2026-07-11 08:00:00+00', '2026-07-11 13:00:00+00', 'SUBMITTED', 'USED', 4, 0, 4, v_email);
  END IF;

  -- ── APPROVED / EARNED ─────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 506 AND ct_starting_time = '2026-05-10 20:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (506, 101, 'Deploy nocturno aprobado', '2026-05-10 20:00:00+00', '2026-05-11 00:00:00+00', 'APPROVED', 'EARNED', 0, 4, 4, v_email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 507 AND ct_starting_time = '2026-04-26 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (507, 102, 'Cierre de sprint urgente fin de semana', '2026-04-26 08:00:00+00', '2026-04-26 17:00:00+00', 'APPROVED', 'EARNED', 8, 0, 8, v_email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 508 AND ct_starting_time = '2026-05-17 19:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (508, 103, 'Guardia nocturna sistema crítico', '2026-05-17 19:00:00+00', '2026-05-18 01:00:00+00', 'APPROVED', 'EARNED', 0, 6, 6, v_email);
  END IF;

  -- ── APPROVED / USED ──────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 509 AND ct_starting_time = '2026-05-22 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (509, 104, 'Compensatorio tomado por guardia mayo', '2026-05-22 08:00:00+00', '2026-05-22 17:00:00+00', 'APPROVED', 'USED', 8, 0, 8, v_email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 500 AND ct_starting_time = '2026-04-17 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (500, 100, 'Uso compensatorio acumulado Q1', '2026-04-17 08:00:00+00', '2026-04-17 17:00:00+00', 'APPROVED', 'USED', 8, 0, 8, v_email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 501 AND ct_starting_time = '2026-04-24 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by)
    VALUES (501, 101, 'Tarde libre compensatorio aprobada', '2026-04-24 08:00:00+00', '2026-04-24 13:00:00+00', 'APPROVED', 'USED', 4, 0, 4, v_email);
  END IF;

  -- ── REJECTED / EARNED ────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 502 AND ct_starting_time = '2026-03-21 09:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by, ct_rejection_reason)
    VALUES (502, 102, 'Horas extra no autorizadas', '2026-03-21 09:00:00+00', '2026-03-21 18:00:00+00', 'REJECTED', 'EARNED', 8, 0, 8, v_email, 'Las horas extra deben ser pre-autorizadas por el supervisor antes de trabajarse.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 503 AND ct_starting_time = '2026-04-04 10:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by, ct_rejection_reason)
    VALUES (503, 103, 'Trabajo festivo sin preautorización', '2026-04-04 10:00:00+00', '2026-04-04 15:00:00+00', 'REJECTED', 'EARNED', 5, 0, 5, v_email, 'No se presentó preautorización del cliente para trabajo en festivo.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 504 AND ct_starting_time = '2026-04-11 20:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by, ct_rejection_reason)
    VALUES (504, 104, 'Guardia nocturna no registrada en sistema', '2026-04-11 20:00:00+00', '2026-04-12 02:00:00+00', 'REJECTED', 'EARNED', 0, 6, 6, v_email, 'No hay registro de la guardia en el sistema de turnos.');
  END IF;

  -- ── REJECTED / USED ──────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 505 AND ct_starting_time = '2026-03-13 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by, ct_rejection_reason)
    VALUES (505, 100, 'Compensatorio sin balance disponible', '2026-03-13 08:00:00+00', '2026-03-13 17:00:00+00', 'REJECTED', 'USED', 8, 0, 8, v_email, 'El colaborador no tiene balance de compensatorio disponible para usar.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 506 AND ct_starting_time = '2026-03-20 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by, ct_rejection_reason)
    VALUES (506, 101, 'Día libre en periodo bloqueado', '2026-03-20 08:00:00+00', '2026-03-20 17:00:00+00', 'REJECTED', 'USED', 8, 0, 8, v_email, 'La fecha solicitada cae dentro del periodo de cierre del cliente Q1.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.ct_compensatory_time WHERE tms_id = 507 AND ct_starting_time = '2026-03-27 08:00:00+00') THEN
    INSERT INTO ds.ct_compensatory_time (tms_id, pro_id, ct_subject, ct_starting_time, ct_ending_time, ct_status, ct_comp_type, ct_day_hours, ct_night_hours, ct_total_credited_hours, ct_created_by, ct_rejection_reason)
    VALUES (507, 102, 'Uso compensatorio fuera de fecha de vencimiento', '2026-03-27 08:00:00+00', '2026-03-27 17:00:00+00', 'REJECTED', 'USED', 8, 0, 8, v_email, 'El compensatorio acumulado expiró antes de la fecha de uso solicitada.');
  END IF;

END $$;

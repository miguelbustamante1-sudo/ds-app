-- ============================================================
-- Sample data: Holiday Swaps (ds.hsw_holiday_swap)
-- Statuses: 1=Tentative | 2=Acknowledged | 3=Taken
--           4=Cancelled | 5=Rejected
--
-- TMs por país (siempre seeded en seed.sql):
--   El Salvador (cou_id=1): tms_id 500, 503, 506, 509
--   Guatemala   (cou_id=2): tms_id 501, 504, 507
--   Mexico      (cou_id=3): tms_id 502, 505, 508
--
-- Holidays usados (todos seeded en seed.sql):
--   SV: hol_id 15 (Labor Day 2026-05-01), 67 (Día del Trabajo 2026-05-01)
--       hol_id 21 (Independence Day 2026-09-15), hol_id 23 (Christmas 2026-12-25)
--       hol_id 68 (Día de la Madre 2026-05-10)
--   GT: hol_id 2 (Labor Day 2026-05-01), hol_id 5 (Independence Day 2026-09-15)
--       hol_id 6 (Revolution Day 2026-10-20), hol_id 7 (All Saints 2026-11-01)
--       hol_id 9 (Christmas Day 2026-12-25)
--   MX: hol_id 53 (Día del Trabajo 2026-05-01), hol_id 54 (Independencia 2026-09-16)
--       hol_id 56 (Navidad 2026-12-25), hol_id 51 (Constitución 2026-02-02)
--       hol_id 52 (Benito Juárez 2026-03-16)
--
-- Idempotency: guarded by (tms_id, hol_id, hsw_original_date)
-- ============================================================

DO $$
BEGIN

  -- ── 1 — TENTATIVE (pendientes de aprobación) ─────────────

  -- SV: tms 500 trabaja Labor Day 2026-05-01, descansa 2026-05-04
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 500 AND hol_id = 15 AND hsw_original_date = '2026-05-01') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (500, 15, 1, '2026-05-01', '2026-05-04', 'laura.mendoza@telusinternational.com', true);
  END IF;

  -- SV: tms 503 trabaja Independence Day 2026-09-15, descansa 2026-09-18
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 503 AND hol_id = 21 AND hsw_original_date = '2026-09-15') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (503, 21, 1, '2026-09-15', '2026-09-18', 'diego.castillo@telusinternational.com', true);
  END IF;

  -- GT: tms 501 trabaja Labor Day 2026-05-01, descansa 2026-05-04
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 501 AND hol_id = 2 AND hsw_original_date = '2026-05-01') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (501, 2, 1, '2026-05-01', '2026-05-04', 'carlos.herrera@telusinternational.com', true);
  END IF;

  -- MX: tms 502 trabaja Día del Trabajo 2026-05-01, descansa 2026-05-04
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 502 AND hol_id = 53 AND hsw_original_date = '2026-05-01') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (502, 53, 1, '2026-05-01', '2026-05-04', 'sofia.ruiz@telusinternational.com', true);
  END IF;

  -- MX: tms 505 trabaja Día de la Independencia 2026-09-16, descansa 2026-09-18
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 505 AND hol_id = 54 AND hsw_original_date = '2026-09-16') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (505, 54, 1, '2026-09-16', '2026-09-18', 'andrea.vega@telusinternational.com', true);
  END IF;

  -- ── 2 — ACKNOWLEDGED (aprobadas por supervisor) ──────────

  -- SV: tms 506 trabaja Día de la Madre 2026-05-10, descansa 2026-05-11
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 506 AND hol_id = 68 AND hsw_original_date = '2026-05-10') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_updated_by, hsw_active)
    VALUES (506, 68, 2, '2026-05-10', '2026-05-11', 'valeria.mora@telusinternational.com', 'supervisor@telusinternational.com', true);
  END IF;

  -- GT: tms 504 trabaja Independence Day 2026-09-15, descansa 2026-09-17
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 504 AND hol_id = 5 AND hsw_original_date = '2026-09-15') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_updated_by, hsw_active)
    VALUES (504, 5, 2, '2026-09-15', '2026-09-17', 'andrea.vega@telusinternational.com', 'supervisor@telusinternational.com', true);
  END IF;

  -- GT: tms 507 trabaja Revolution Day 2026-10-20, descansa 2026-10-22
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 507 AND hol_id = 6 AND hsw_original_date = '2026-10-20') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_updated_by, hsw_active)
    VALUES (507, 6, 2, '2026-10-20', '2026-10-22', 'miguel.torres@telusinternational.com', 'supervisor@telusinternational.com', true);
  END IF;

  -- MX: tms 508 trabaja Día de la Constitución 2026-02-02, descansa 2026-02-03
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 508 AND hol_id = 51 AND hsw_original_date = '2026-02-02') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_updated_by, hsw_active)
    VALUES (508, 51, 2, '2026-02-02', '2026-02-03', 'claudia.espino@telusinternational.com', 'supervisor@telusinternational.com', true);
  END IF;

  -- SV: tms 509 trabaja Labor Day 2026-05-01, descansa 2026-05-04
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 509 AND hol_id = 15 AND hsw_original_date = '2026-05-01') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_updated_by, hsw_active)
    VALUES (509, 15, 2, '2026-05-01', '2026-05-04', 'fernando.reyes@telusinternational.com', 'supervisor@telusinternational.com', true);
  END IF;

  -- ── 3 — TAKEN (el día libre ya fue disfrutado) ───────────

  -- SV: tms 500 intercambió Christmas 2026-12-25
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 500 AND hol_id = 23 AND hsw_original_date = '2026-12-25') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (500, 23, 3, '2026-12-25', '2026-12-28', 'laura.mendoza@telusinternational.com', true);
  END IF;

  -- GT: tms 501 intercambió All Saints Day 2026-11-01
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 501 AND hol_id = 7 AND hsw_original_date = '2026-11-01') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (501, 7, 3, '2026-11-01', '2026-11-03', 'carlos.herrera@telusinternational.com', true);
  END IF;

  -- MX: tms 502 intercambió Navidad 2026-12-25
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 502 AND hol_id = 56 AND hsw_original_date = '2026-12-25') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (502, 56, 3, '2026-12-25', '2026-12-28', 'sofia.ruiz@telusinternational.com', true);
  END IF;

  -- MX: tms 505 intercambió Benito Juárez 2026-03-16
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 505 AND hol_id = 52 AND hsw_original_date = '2026-03-16') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (505, 52, 3, '2026-03-16', '2026-03-17', 'andrea.vega@telusinternational.com', true);
  END IF;

  -- SV: tms 503 intercambió Independence Day 2026-09-15
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 503 AND hol_id = 21 AND hsw_original_date = '2025-09-15') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (503, 35, 3, '2025-09-15', '2025-09-16', 'diego.castillo@telusinternational.com', true);
  END IF;

  -- ── 4 — CANCELLED (canceladas antes de ser usadas) ───────

  -- SV: tms 506 canceló intercambio de Labor Day
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 506 AND hol_id = 15 AND hsw_original_date = '2026-05-01') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (506, 15, 4, '2026-05-01', '2026-05-05', 'valeria.mora@telusinternational.com', false);
  END IF;

  -- GT: tms 504 canceló intercambio de Christmas
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 504 AND hol_id = 9 AND hsw_original_date = '2026-12-25') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (504, 9, 4, '2026-12-25', '2026-12-28', 'andrea.vega@telusinternational.com', false);
  END IF;

  -- MX: tms 508 canceló intercambio de Navidad
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 508 AND hol_id = 56 AND hsw_original_date = '2026-12-25') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (508, 56, 4, '2026-12-25', '2026-12-26', 'claudia.espino@telusinternational.com', false);
  END IF;

  -- SV: tms 509 canceló intercambio de Independence Day
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 509 AND hol_id = 21 AND hsw_original_date = '2026-09-15') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (509, 21, 4, '2026-09-15', '2026-09-16', 'fernando.reyes@telusinternational.com', false);
  END IF;

  -- GT: tms 507 canceló intercambio de All Saints
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 507 AND hol_id = 7 AND hsw_original_date = '2026-11-01') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (507, 7, 4, '2026-11-01', '2026-11-02', 'miguel.torres@telusinternational.com', false);
  END IF;

  -- ── 5 — REJECTED (rechazadas por supervisor) ─────────────

  -- SV: tms 500 rechazaron intercambio de Christmas
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 500 AND hol_id = 23 AND hsw_original_date = '2025-12-25') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (500, 37, 5, '2025-12-25', '2025-12-26', 'laura.mendoza@telusinternational.com', false);
  END IF;

  -- GT: tms 501 rechazaron intercambio de Labor Day
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 501 AND hol_id = 42 AND hsw_original_date = '2025-05-01') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (501, 42, 5, '2025-05-01', '2025-05-02', 'carlos.herrera@telusinternational.com', false);
  END IF;

  -- MX: tms 502 rechazaron intercambio de Año Nuevo
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 502 AND hol_id = 72 AND hsw_original_date = '2025-01-01') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (502, 72, 5, '2025-01-01', '2025-01-02', 'sofia.ruiz@telusinternational.com', false);
  END IF;

  -- SV: tms 503 rechazaron intercambio de Mother's Day
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 503 AND hol_id = 32 AND hsw_original_date = '2025-05-10') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (503, 32, 5, '2025-05-10', '2025-05-12', 'diego.castillo@telusinternational.com', false);
  END IF;

  -- MX: tms 505 rechazaron intercambio de Día del Trabajo
  IF NOT EXISTS (SELECT 1 FROM ds.hsw_holiday_swap WHERE tms_id = 505 AND hol_id = 77 AND hsw_original_date = '2025-05-01') THEN
    INSERT INTO ds.hsw_holiday_swap (tms_id, hol_id, sta_id, hsw_original_date, hsw_replacement_date, hsw_created_by, hsw_active)
    VALUES (505, 77, 5, '2025-05-01', '2025-05-02', 'andrea.vega@telusinternational.com', false);
  END IF;

END $$;

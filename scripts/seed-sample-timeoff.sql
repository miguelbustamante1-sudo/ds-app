-- ============================================================
-- Sample data: Time Off (ds.tbl_tms_time_off)
-- Statuses: 1=Tentative | 2=Acknowledged | 3=Taken
--           4=Cancelled | 5=Rejected     | 6=Split
-- Categories: 14=Vacation | 13=Personal Day | 9=Medical
--             2=Bereavement | 6=LOA
-- References: tms_id 500-509 (fictional TMs always seeded)
--             tto_created_by = 1 (dev user)
-- Idempotency: guarded by (tms_id, tto_stadat, sta_id)
-- ============================================================

DO $$
BEGIN

  -- ── 1 — TENTATIVE (solicitudes recientes, aún no aprobadas) ──
  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 500 AND tto_stadat = '2026-07-14') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (500, '2026-07-14', '2026-07-18', 5, 14, 1, 1, 1, CURRENT_DATE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 501 AND tto_stadat = '2026-07-20') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (501, '2026-07-20', '2026-07-20', 1, 13, 1, 1, 1, CURRENT_DATE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 502 AND tto_stadat = '2026-08-03') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (502, '2026-08-03', '2026-08-07', 5, 14, 1, 1, 1, CURRENT_DATE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 503 AND tto_stadat = '2026-08-10') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (503, '2026-08-10', '2026-08-11', 2, 9, 1, 1, 1, CURRENT_DATE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 504 AND tto_stadat = '2026-09-01') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (504, '2026-09-01', '2026-09-05', 5, 14, 1, 1, 1, CURRENT_DATE);
  END IF;

  -- ── 2 — ACKNOWLEDGED (revisadas por supervisor) ──────────
  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 505 AND tto_stadat = '2026-06-23') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (505, '2026-06-23', '2026-06-27', 5, 14, 2, 1, 1, '2026-06-10', 1, '2026-06-12');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 506 AND tto_stadat = '2026-06-30') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (506, '2026-06-30', '2026-06-30', 1, 13, 2, 1, 1, '2026-06-20', 1, '2026-06-22');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 507 AND tto_stadat = '2026-07-07') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (507, '2026-07-07', '2026-07-10', 4, 9, 2, 1, 1, '2026-06-25', 1, '2026-06-27');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 508 AND tto_stadat = '2026-07-21') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (508, '2026-07-21', '2026-07-25', 5, 14, 2, 1, 1, '2026-07-01', 1, '2026-07-03');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 509 AND tto_stadat = '2026-07-28') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (509, '2026-07-28', '2026-07-31', 4, 14, 2, 1, 1, '2026-07-05', 1, '2026-07-08');
  END IF;

  -- ── 3 — TAKEN (vacaciones pasadas ya disfrutadas) ────────
  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 500 AND tto_stadat = '2026-03-23') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (500, '2026-03-23', '2026-03-27', 5, 14, 3, 1, 1, '2026-03-01');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 501 AND tto_stadat = '2026-04-06') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (501, '2026-04-06', '2026-04-10', 5, 14, 3, 1, 1, '2026-03-15');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 502 AND tto_stadat = '2026-05-04') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (502, '2026-05-04', '2026-05-08', 5, 14, 3, 1, 1, '2026-04-10');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 503 AND tto_stadat = '2026-02-16') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (503, '2026-02-16', '2026-02-17', 2, 2, 3, 1, 1, '2026-02-14');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 504 AND tto_stadat = '2026-01-19') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (504, '2026-01-19', '2026-01-23', 5, 14, 3, 1, 1, '2026-01-05');
  END IF;

  -- ── 4 — CANCELLED (canceladas antes de ser tomadas) ──────
  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 505 AND tto_stadat = '2026-05-11') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (505, '2026-05-11', '2026-05-15', 5, 14, 4, 0, 1, '2026-04-20', 1, '2026-05-05');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 506 AND tto_stadat = '2026-06-01') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (506, '2026-06-01', '2026-06-05', 5, 14, 4, 0, 1, '2026-05-10', 1, '2026-05-28');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 507 AND tto_stadat = '2026-04-20') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (507, '2026-04-20', '2026-04-20', 1, 13, 4, 0, 1, '2026-04-10', 1, '2026-04-18');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 508 AND tto_stadat = '2026-03-02') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (508, '2026-03-02', '2026-03-06', 5, 14, 4, 0, 1, '2026-02-20', 1, '2026-02-28');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 509 AND tto_stadat = '2026-04-27') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (509, '2026-04-27', '2026-04-30', 4, 6, 4, 0, 1, '2026-04-15', 1, '2026-04-25');
  END IF;

  -- ── 5 — REJECTED (rechazadas por supervisor) ─────────────
  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 500 AND tto_stadat = '2026-12-21') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (500, '2026-12-21', '2026-12-31', 11, 14, 5, 0, 1, '2026-11-15', 1, '2026-11-20');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 501 AND tto_stadat = '2026-12-14') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (501, '2026-12-14', '2026-12-18', 5, 14, 5, 0, 1, '2026-11-28', 1, '2026-12-02');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 502 AND tto_stadat = '2026-11-02') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (502, '2026-11-02', '2026-11-06', 5, 14, 5, 0, 1, '2026-10-20', 1, '2026-10-25');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 503 AND tto_stadat = '2026-10-05') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (503, '2026-10-05', '2026-10-09', 5, 14, 5, 0, 1, '2026-09-20', 1, '2026-09-25');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 504 AND tto_stadat = '2026-11-16') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat)
    VALUES (504, '2026-11-16', '2026-11-20', 5, 14, 5, 0, 1, '2026-11-01', 1, '2026-11-05');
  END IF;

  -- ── 6 — SPLIT (divididas por el sistema) ─────────────────
  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 505 AND tto_stadat = '2026-07-06') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (505, '2026-07-06', '2026-07-08', 3, 14, 6, 1, 1, '2026-06-20');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 506 AND tto_stadat = '2026-08-17') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (506, '2026-08-17', '2026-08-19', 3, 14, 6, 1, 1, '2026-08-01');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 507 AND tto_stadat = '2026-09-14') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (507, '2026-09-14', '2026-09-16', 3, 9, 6, 1, 1, '2026-09-01');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 508 AND tto_stadat = '2026-10-19') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (508, '2026-10-19', '2026-10-21', 3, 14, 6, 1, 1, '2026-10-05');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 509 AND tto_stadat = '2026-11-09') THEN
    INSERT INTO ds.tbl_tms_time_off (tms_id, tto_stadat, tto_enddat, tto_days, tot_id, sta_id, tto_active, tto_created_by, tto_credat)
    VALUES (509, '2026-11-09', '2026-11-11', 3, 14, 6, 1, 1, '2026-10-28');
  END IF;

END $$;

-- Bench: areas funcionales + TMs ficticios en bench
-- Idempotente: ON CONFLICT DO NOTHING para areas funcionales, guards por (tms_id, ben_start_date)

-- Areas funcionales requeridas por bench (far_id es FK requerido)
INSERT INTO ds.far_functional_areas(far_name, cou_id) VALUES ('Engineering',         1) ON CONFLICT DO NOTHING;
INSERT INTO ds.far_functional_areas(far_name, cou_id) VALUES ('QA',                  1) ON CONFLICT DO NOTHING;
INSERT INTO ds.far_functional_areas(far_name, cou_id) VALUES ('Project Management',  2) ON CONFLICT DO NOTHING;
INSERT INTO ds.far_functional_areas(far_name, cou_id) VALUES ('Business Analysis',   2) ON CONFLICT DO NOTHING;
INSERT INTO ds.far_functional_areas(far_name, cou_id) VALUES ('DevOps',              3) ON CONFLICT DO NOTHING;

-- TM 500 en bench desde junio 2026 (100% allocation)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 500)
  AND NOT EXISTS (SELECT 1 FROM ds.ben_bench WHERE tms_id = 500 AND ben_start_date = '2026-06-01') THEN
    INSERT INTO ds.ben_bench(tms_id, far_id, ben_allocation, ben_start_date, ben_created_at, ben_created_by)
    VALUES (
      500,
      (SELECT far_id FROM ds.far_functional_areas WHERE far_name = 'Engineering' LIMIT 1),
      100, '2026-06-01', CURRENT_DATE, 1
    );
  END IF;
END $$;

-- TM 501 en bench desde mayo 2026 (50% allocation, ya termino)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 501)
  AND NOT EXISTS (SELECT 1 FROM ds.ben_bench WHERE tms_id = 501 AND ben_start_date = '2026-05-01') THEN
    INSERT INTO ds.ben_bench(tms_id, far_id, ben_allocation, ben_start_date, ben_end_date, ben_created_at, ben_created_by)
    VALUES (
      501,
      (SELECT far_id FROM ds.far_functional_areas WHERE far_name = 'QA' LIMIT 1),
      50, '2026-05-01', '2026-05-31', CURRENT_DATE, 1
    );
  END IF;
END $$;

-- TM 502 en bench desde junio 2026 (75% allocation)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 502)
  AND NOT EXISTS (SELECT 1 FROM ds.ben_bench WHERE tms_id = 502 AND ben_start_date = '2026-06-15') THEN
    INSERT INTO ds.ben_bench(tms_id, far_id, ben_allocation, ben_start_date, ben_created_at, ben_created_by)
    VALUES (
      502,
      (SELECT far_id FROM ds.far_functional_areas WHERE far_name = 'Business Analysis' LIMIT 1),
      75, '2026-06-15', CURRENT_DATE, 1
    );
  END IF;
END $$;

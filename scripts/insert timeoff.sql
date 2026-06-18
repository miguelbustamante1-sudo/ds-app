-- Time Off real de TMs de produccion
-- Idempotente: guard por (tms_id, tto_stadat, tto_enddat) + existencia del TM

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 322)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 322 AND tto_stadat = '2026-01-02' AND tto_enddat = '2026-01-02') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(322, '2026-01-02', '2026-01-02', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 2);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 196)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 196 AND tto_stadat = '2026-02-16' AND tto_enddat = '2026-02-18') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(196, '2026-02-16', '2026-02-18', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 399)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 399 AND tto_stadat = '2026-04-13' AND tto_enddat = '2026-04-13') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(399, '2026-04-13', '2026-04-13', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 322)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 322 AND tto_stadat = '2026-05-19' AND tto_enddat = '2026-05-26') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(322, '2026-05-19', '2026-05-26', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 2);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 421)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 421 AND tto_stadat = '2026-04-20' AND tto_enddat = '2026-04-24') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(421, '2026-04-20', '2026-04-24', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 419)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 419 AND tto_stadat = '2026-08-10' AND tto_enddat = '2026-08-12') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(419, '2026-08-10', '2026-08-12', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 2);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 267)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 267 AND tto_stadat = '2026-07-13' AND tto_enddat = '2026-07-17') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(267, '2026-07-13', '2026-07-17', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 267)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 267 AND tto_stadat = '2026-07-20' AND tto_enddat = '2026-07-22') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(267, '2026-07-20', '2026-07-22', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 196)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 196 AND tto_stadat = '2026-06-08' AND tto_enddat = '2026-06-23') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(196, '2026-06-08', '2026-06-23', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 426)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 426 AND tto_stadat = '2026-06-22' AND tto_enddat = '2026-06-29') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(426, '2026-06-22', '2026-06-29', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 341)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 341 AND tto_stadat = '2026-06-01' AND tto_enddat = '2026-06-05') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(341, '2026-06-01', '2026-06-05', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 375)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 375 AND tto_stadat = '2026-08-03' AND tto_enddat = '2026-08-12') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(375, '2026-08-03', '2026-08-12', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 444)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 444 AND tto_stadat = '2026-09-08' AND tto_enddat = '2026-09-15') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(444, '2026-09-08', '2026-09-15', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 322)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 322 AND tto_stadat = '2026-10-12' AND tto_enddat = '2026-10-23') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(322, '2026-10-12', '2026-10-23', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 419)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 419 AND tto_stadat = '2026-11-09' AND tto_enddat = '2026-11-11') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(419, '2026-11-09', '2026-11-11', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 399)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 399 AND tto_stadat = '2026-11-09' AND tto_enddat = '2026-11-18') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(399, '2026-11-09', '2026-11-18', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 267)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 267 AND tto_stadat = '2026-11-16' AND tto_enddat = '2026-11-19') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(267, '2026-11-16', '2026-11-19', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 2);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 267)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 267 AND tto_stadat = '2026-11-23' AND tto_enddat = '2026-11-26') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(267, '2026-11-23', '2026-11-26', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 341)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 341 AND tto_stadat = '2026-12-15' AND tto_enddat = '2026-12-17') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(341, '2026-12-15', '2026-12-17', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 421)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 421 AND tto_stadat = '2027-03-29' AND tto_enddat = '2027-04-07') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(421, '2027-03-29', '2027-04-07', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 419)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 419 AND tto_stadat = '2027-04-12' AND tto_enddat = '2027-04-14') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(419, '2027-04-12', '2027-04-14', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 426)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 426 AND tto_stadat = '2027-06-21' AND tto_enddat = '2027-06-30') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(426, '2027-06-21', '2027-06-30', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 426)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 426 AND tto_stadat = '2028-06-19' AND tto_enddat = '2028-06-30') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(426, '2028-06-19', '2028-06-30', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 444)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 444 AND tto_stadat = '2027-09-06' AND tto_enddat = '2027-09-15') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(444, '2027-09-06', '2027-09-15', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 196)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 196 AND tto_stadat = '2027-09-06' AND tto_enddat = '2027-09-21') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(196, '2027-09-06', '2027-09-21', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 322)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 322 AND tto_stadat = '2027-10-11' AND tto_enddat = '2027-10-26') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(322, '2027-10-11', '2027-10-26', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 399)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 399 AND tto_stadat = '2027-11-08' AND tto_enddat = '2027-11-19') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(399, '2027-11-08', '2027-11-19', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 419)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 419 AND tto_stadat = '2027-12-06' AND tto_enddat = '2027-12-08') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(419, '2027-12-06', '2027-12-08', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 421)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 421 AND tto_stadat = '2028-03-27' AND tto_enddat = '2028-04-07') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(421, '2028-03-27', '2028-04-07', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 341)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 341 AND tto_stadat = '2027-06-14' AND tto_enddat = '2027-06-25') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(341, '2027-06-14', '2027-06-25', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 2);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 196)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 196 AND tto_stadat = '2026-02-11' AND tto_enddat = '2026-02-11') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(196, '2026-02-11', '2026-02-11', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 2);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 426)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 426 AND tto_stadat = '2026-03-12' AND tto_enddat = '2026-03-12') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(426, '2026-03-12', '2026-03-12', 1, '2026-03-19', 1, '2026-03-19', 15, 1, 2);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 426)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 426 AND tto_stadat = '2026-03-13' AND tto_enddat = '2026-03-13') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(426, '2026-03-13', '2026-03-13', 1, '2026-03-19', 1, '2026-03-19', 15, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 426)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 426 AND tto_stadat = '2026-03-17' AND tto_enddat = '2026-03-17') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(426, '2026-03-17', '2026-03-17', 1, '2026-03-19', 1, '2026-03-19', 15, 1, 3);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 196)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 196 AND tto_stadat = '2026-03-11' AND tto_enddat = '2026-03-11') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(196, '2026-03-11', '2026-03-11', 1, '2026-03-19', 1, '2026-03-19', 15, 1, 2);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 399)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 399 AND tto_stadat = '2026-04-20' AND tto_enddat = '2026-04-20') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(399, '2026-04-20', '2026-04-20', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 399)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 399 AND tto_stadat = '2026-04-17' AND tto_enddat = '2026-04-17') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(399, '2026-04-17', '2026-04-17', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 2);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 399)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 399 AND tto_stadat = '2026-08-17' AND tto_enddat = '2026-08-17') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(399, '2026-08-17', '2026-08-17', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 2);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 322)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 322 AND tto_stadat = '2026-04-01' AND tto_enddat = '2026-04-01') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(322, '2026-04-01', '2026-04-01', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 421)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 421 AND tto_stadat = '2026-09-15' AND tto_enddat = '2026-09-15') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(421, '2026-09-15', '2026-09-15', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 322)
  AND NOT EXISTS (SELECT 1 FROM ds.tbl_tms_time_off WHERE tms_id = 322 AND tto_stadat = '2026-04-06' AND tto_enddat = '2026-04-06') THEN
    insert into ds.tbl_tms_time_off(tms_id, tto_stadat, tto_enddat, tto_created_by, tto_credat, tto_last_updated_ny, tto_last_upddat, tot_id, tto_active, sta_id) values(322, '2026-04-06', '2026-04-06', 1, '2026-03-19', 1, '2026-03-19', 16, 1, 1);
  END IF;
END $$;

-- Endorsements, Bonus Categories, Endorsement Bonuses, Team Member Bonuses, y Hiring
-- Orden: BonusCategories -> BonusSubcategories -> Endorsements -> EndorsementBonuses -> TeamMemberBonuses -> Hiring
-- Idempotente: ON CONFLICT / IF NOT EXISTS guards

-- ── Bonus Categories ──────────────────────────────────────────────────────────
INSERT INTO ds.bca_bonus_categories(bca_name) VALUES ('Spot Award')        ON CONFLICT (bca_name) DO NOTHING;
INSERT INTO ds.bca_bonus_categories(bca_name) VALUES ('Performance Bonus') ON CONFLICT (bca_name) DO NOTHING;
INSERT INTO ds.bca_bonus_categories(bca_name) VALUES ('Referral Bonus')    ON CONFLICT (bca_name) DO NOTHING;

-- ── Bonus Subcategories (por pais: SV=1, GT=2, MX=3) ─────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.bsc_bonus_subcategories
    WHERE bca_id = (SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Spot Award')
      AND bsc_name = 'Spot Award SV' AND cou_id = 1) THEN
    INSERT INTO ds.bsc_bonus_subcategories(bca_id, bsc_name, cou_id, bsc_metadata, bsc_default_amount)
    VALUES ((SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Spot Award'),
            'Spot Award SV', 1, '{}', 100.00);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.bsc_bonus_subcategories
    WHERE bca_id = (SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Spot Award')
      AND bsc_name = 'Spot Award GT' AND cou_id = 2) THEN
    INSERT INTO ds.bsc_bonus_subcategories(bca_id, bsc_name, cou_id, bsc_metadata, bsc_default_amount)
    VALUES ((SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Spot Award'),
            'Spot Award GT', 2, '{}', 100.00);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.bsc_bonus_subcategories
    WHERE bca_id = (SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Performance Bonus')
      AND bsc_name = 'Performance Q1 SV' AND cou_id = 1) THEN
    INSERT INTO ds.bsc_bonus_subcategories(bca_id, bsc_name, cou_id, bsc_metadata, bsc_default_amount)
    VALUES ((SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Performance Bonus'),
            'Performance Q1 SV', 1, '{}', 250.00);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.bsc_bonus_subcategories
    WHERE bca_id = (SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Referral Bonus')
      AND bsc_name = 'Referral Standard SV' AND cou_id = 1) THEN
    INSERT INTO ds.bsc_bonus_subcategories(bca_id, bsc_name, cou_id, bsc_metadata, bsc_default_amount)
    VALUES ((SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Referral Bonus'),
            'Referral Standard SV', 1, '{}', 500.00);
  END IF;
END $$;

-- ── Endorsements (candidatos ficticios para contratacion) ─────────────────────
-- pos_id 1 = primer cargo disponible; pro_id del primer proyecto disponible; cou_id=1 (SV)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.end_endorsements WHERE end_candidate_first_name = 'Carlos' AND end_candidate_last_name = 'Mendoza Reyes') THEN
    INSERT INTO ds.end_endorsements(
      end_candidate_first_name, end_candidate_last_name, pos_id, pro_id,
      end_client_manager_email, cou_id, end_start_date, end_status, end_created_by
    )
    VALUES (
      'Carlos', 'Mendoza Reyes',
      (SELECT pos_id FROM ds.pos_positions LIMIT 1),
      (SELECT pro_id FROM ds.pro_projects WHERE pro_active = TRUE LIMIT 1),
      'cmanager@client.com', 1, '2026-07-01', 'Approved', 1
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.end_endorsements WHERE end_candidate_first_name = 'Sofia' AND end_candidate_last_name = 'Lopez Castillo') THEN
    INSERT INTO ds.end_endorsements(
      end_candidate_first_name, end_candidate_last_name, pos_id, pro_id,
      end_client_manager_email, cou_id, end_start_date, end_status, end_created_by
    )
    VALUES (
      'Sofia', 'Lopez Castillo',
      (SELECT pos_id FROM ds.pos_positions LIMIT 1 OFFSET 1),
      (SELECT pro_id FROM ds.pro_projects WHERE pro_active = TRUE LIMIT 1),
      'cmanager@client.com', 2, '2026-08-01', 'Pending', 1
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.end_endorsements WHERE end_candidate_first_name = 'Diego' AND end_candidate_last_name = 'Torres Fuentes') THEN
    INSERT INTO ds.end_endorsements(
      end_candidate_first_name, end_candidate_last_name, pos_id, pro_id,
      end_client_manager_email, cou_id, end_start_date, end_status, end_created_by
    )
    VALUES (
      'Diego', 'Torres Fuentes',
      (SELECT pos_id FROM ds.pos_positions LIMIT 1),
      (SELECT pro_id FROM ds.pro_projects WHERE pro_active = TRUE LIMIT 1 OFFSET 1),
      'mgr@telus.com', 3, '2026-09-01', 'Rejected', 1
    );
  END IF;
END $$;

-- ── Endorsement Bonuses ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.ebn_endorsement_bonus
    WHERE end_id = (SELECT end_id FROM ds.end_endorsements WHERE end_candidate_first_name = 'Carlos' AND end_candidate_last_name = 'Mendoza Reyes')
  ) THEN
    INSERT INTO ds.ebn_endorsement_bonus(end_id, bsc_id, ebn_amount, ebn_metadata, ebn_created_by)
    VALUES (
      (SELECT end_id FROM ds.end_endorsements WHERE end_candidate_first_name = 'Carlos' AND end_candidate_last_name = 'Mendoza Reyes'),
      (SELECT bsc_id FROM ds.bsc_bonus_subcategories WHERE bsc_name = 'Referral Standard SV' LIMIT 1),
      500.00, '{}', 'seed'
    );
  END IF;
END $$;

-- ── Team Member Bonuses (para TMs ficticios) ──────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 500)
  AND NOT EXISTS (SELECT 1 FROM ds.tmb_team_member_bonus WHERE tms_id = 500
    AND bca_id = (SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Spot Award')) THEN
    INSERT INTO ds.tmb_team_member_bonus(tms_id, bca_id, tmb_amount, tmb_periodicity, tmb_start_date, tmb_created_by)
    VALUES (
      500,
      (SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Spot Award'),
      100.00, 'ONE_TIME', '2026-03-01', 1
    );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ds.tbl_team_members WHERE tms_id = 501)
  AND NOT EXISTS (SELECT 1 FROM ds.tmb_team_member_bonus WHERE tms_id = 501
    AND bca_id = (SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Performance Bonus')) THEN
    INSERT INTO ds.tmb_team_member_bonus(tms_id, bca_id, tmb_amount, tmb_periodicity, tmb_start_date, tmb_end_date, tmb_created_by)
    VALUES (
      501,
      (SELECT bca_id FROM ds.bca_bonus_categories WHERE bca_name = 'Performance Bonus'),
      250.00, 'QUARTERLY', '2026-01-01', '2026-03-31', 1
    );
  END IF;
END $$;

-- ── Hiring (basado en endorsements Approved) ──────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.hir_hiring
    WHERE end_id = (SELECT end_id FROM ds.end_endorsements WHERE end_candidate_first_name = 'Carlos' AND end_candidate_last_name = 'Mendoza Reyes')
  ) THEN
    INSERT INTO ds.hir_hiring(end_id, hir_start_date, hir_billable_date, hir_status, hir_created_by)
    VALUES (
      (SELECT end_id FROM ds.end_endorsements WHERE end_candidate_first_name = 'Carlos' AND end_candidate_last_name = 'Mendoza Reyes'),
      '2026-07-01', '2026-07-15', 'Active', 1
    );
  END IF;
END $$;

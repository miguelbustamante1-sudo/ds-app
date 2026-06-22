-- Top Performers: ciclo, nominaciones, votos y decision de comite
-- Usa TMs ficticios 500-509 (seeded por seed.sql)
-- Idempotente: guards por unicidad de cada tabla

-- Ciclo: un ciclo COMPLETED con fechas pasadas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers') THEN
    INSERT INTO ds.cyc_cycles(cyc_name, cyc_nominations_start, cyc_nominations_end, cyc_voting_start, cyc_voting_end, cyc_status, cyc_created_by, cyc_created_date)
    VALUES ('Q1 2026 Top Performers', '2026-01-01', '2026-02-28', '2026-03-01', '2026-03-15', 'COMPLETED', 1, '2026-01-01');
  END IF;
END $$;

-- Nominaciones (3) para el ciclo Q1
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.nom_nominations
    WHERE cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')
      AND nom_nominee_id = 501
  ) THEN
    INSERT INTO ds.nom_nominations(cyc_id, nom_nominee_id, nom_nominator_id, nom_type, nom_achievement_text, nom_anonymization_status, nom_status, nom_is_voz_del_cliente, nom_created_by, nom_created_date)
    VALUES (
      (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'),
      501, 500, 'PEER',
      'Excepcional colaboracion en el proyecto de integracion de APIs, ayudo a reducir tiempo de entrega en 20%.',
      'COMPLETED', 'APPROVED', FALSE, 1, '2026-02-15'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.nom_nominations
    WHERE cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')
      AND nom_nominee_id = 502
  ) THEN
    INSERT INTO ds.nom_nominations(cyc_id, nom_nominee_id, nom_nominator_id, nom_type, nom_achievement_text, nom_anonymization_status, nom_status, nom_is_voz_del_cliente, nom_created_by, nom_created_date)
    VALUES (
      (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'),
      502, 503, 'PEER',
      'Liderazgo tecnico en la migracion de base de datos critica sin tiempo de inactividad.',
      'COMPLETED', 'APPROVED', FALSE, 1, '2026-02-20'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.nom_nominations
    WHERE cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')
      AND nom_nominee_id = 504
  ) THEN
    INSERT INTO ds.nom_nominations(cyc_id, nom_nominee_id, nom_nominator_id, nom_type, nom_achievement_text, nom_anonymization_status, nom_status, nom_is_voz_del_cliente, nom_created_by, nom_created_date)
    VALUES (
      (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'),
      504, 500, 'ADMIN',
      'Incremento de satisfaccion del cliente de 15 puntos en NPS durante Q1.',
      'COMPLETED', 'APPROVED', FALSE, 1, '2026-02-25'
    );
  END IF;
END $$;

-- Voto del TM 500 para el ciclo Q1
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.vot_votes
    WHERE cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')
      AND vot_voter_id = 500
  ) THEN
    INSERT INTO ds.vot_votes(cyc_id, vot_voter_id, vot_submitted_at, vot_created_by, vot_created_date)
    VALUES (
      (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'),
      500, '2026-03-10', 1, '2026-03-10'
    );
  END IF;
END $$;

-- Vote items: 3 nominaciones rankeadas
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.vti_vote_items
    WHERE vot_id = (SELECT vot_id FROM ds.vot_votes WHERE vot_voter_id = 500
                    AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'))
      AND nom_id = (SELECT nom_id FROM ds.nom_nominations WHERE nom_nominee_id = 501
                    AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'))
  ) THEN
    INSERT INTO ds.vti_vote_items(vot_id, nom_id, vti_rank, vti_raw_points, vti_multiplier, vti_weighted_points)
    VALUES (
      (SELECT vot_id FROM ds.vot_votes WHERE vot_voter_id = 500
       AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')),
      (SELECT nom_id FROM ds.nom_nominations WHERE nom_nominee_id = 501
       AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')),
      1, 3, 1.0, 3.0
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.vti_vote_items
    WHERE vot_id = (SELECT vot_id FROM ds.vot_votes WHERE vot_voter_id = 500
                    AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'))
      AND nom_id = (SELECT nom_id FROM ds.nom_nominations WHERE nom_nominee_id = 502
                    AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'))
  ) THEN
    INSERT INTO ds.vti_vote_items(vot_id, nom_id, vti_rank, vti_raw_points, vti_multiplier, vti_weighted_points)
    VALUES (
      (SELECT vot_id FROM ds.vot_votes WHERE vot_voter_id = 500
       AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')),
      (SELECT nom_id FROM ds.nom_nominations WHERE nom_nominee_id = 502
       AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')),
      2, 2, 1.0, 2.0
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.vti_vote_items
    WHERE vot_id = (SELECT vot_id FROM ds.vot_votes WHERE vot_voter_id = 500
                    AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'))
      AND nom_id = (SELECT nom_id FROM ds.nom_nominations WHERE nom_nominee_id = 504
                    AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'))
  ) THEN
    INSERT INTO ds.vti_vote_items(vot_id, nom_id, vti_rank, vti_raw_points, vti_multiplier, vti_weighted_points)
    VALUES (
      (SELECT vot_id FROM ds.vot_votes WHERE vot_voter_id = 500
       AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')),
      (SELECT nom_id FROM ds.nom_nominations WHERE nom_nominee_id = 504
       AND cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')),
      3, 1, 1.0, 1.0
    );
  END IF;
END $$;

-- Decision del comite: TM 501 ganador
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ds.dec_decisions
    WHERE cyc_id = (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers')
  ) THEN
    INSERT INTO ds.dec_decisions(cyc_id, dec_winner_id, dec_justification, dec_created_by, dec_created_date)
    VALUES (
      (SELECT cyc_id FROM ds.cyc_cycles WHERE cyc_name = 'Q1 2026 Top Performers'),
      501,
      'Mayor impacto measurable en reduccion de tiempo de entrega del equipo.',
      1, '2026-03-16'
    );
  END IF;
END $$;

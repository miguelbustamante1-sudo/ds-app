-- ============================================================
-- Bench Virtual Project — INSERT script
-- Sprint 1A: Project Assignments Refinement
-- Author: Pablo Aguilar / 2026-06-03
-- ============================================================
-- Purpose: Creates the "Bench" virtual project used to track
-- team members whose total allocation across active assignments
-- is less than 100%. This project has no client and no PM.
--
-- IMPORTANT: Note the returned pro_id and set it as:
--   - BENCH_PROJECT_ID in Cloud Run env vars (staging/prod)
--   - VITE_BENCH_PROJECT_ID in ds-app/client/.env.local (local dev)
-- ============================================================

INSERT INTO ds.pro_projects (
  pro_name,
  pro_external_id,
  pro_active,
  pro_created_at,
  pro_created_by,
  cli_id,
  tms_id_pm
)
VALUES (
  'Bench',
  'BENCH',
  true,
  CURRENT_DATE,
  'system',
  NULL,
  NULL
)
RETURNING pro_id, pro_name, pro_external_id, pro_active, pro_created_at;

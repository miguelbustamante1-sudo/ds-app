-- ============================================================
-- Purpose : Create per-project access grants so a project can be
--           owned/viewed by users beyond its PM. Enables OM project
--           assignment and view-vs-modify scoping.
-- Date    : 2026-07-11
-- Spec    : ds-app-endorsement-hiring (FR-012, FR-013, DEC-004, Q-007)
-- Tables  : ds.pgr_project_grants
-- Notes   : Idempotent. PM ownership still derives from
--           ds.pro_projects.tms_id_pm (no new column there); this table
--           extends ownership/view to OMs and others.
--           pgr_access: 'owner' (modify) | 'view' (read-only).
-- ============================================================

CREATE TABLE IF NOT EXISTS ds.pgr_project_grants (
  pgr_id         SERIAL PRIMARY KEY,
  pro_id         INTEGER      NOT NULL REFERENCES ds.pro_projects(pro_id),
  tms_id         INTEGER      NOT NULL REFERENCES ds.tbl_team_members(tms_id),
  pgr_access     VARCHAR(10)  NOT NULL DEFAULT 'view',   -- 'owner' | 'view'
  pgr_created_by INTEGER      NOT NULL REFERENCES ds.tbl_users(usr_id),
  pgr_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pgr_project_grants UNIQUE (pro_id, tms_id)
);

CREATE INDEX IF NOT EXISTS idx_pgr_project_grants_pro_id
  ON ds.pgr_project_grants (pro_id);

CREATE INDEX IF NOT EXISTS idx_pgr_project_grants_tms_id
  ON ds.pgr_project_grants (tms_id);

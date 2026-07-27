-- ============================================================
-- Purpose : Create the Team-Lead edit approval workflow table.
--           A Team Lead's edits to sensitive team-member fields (and
--           the attrition action) create a request an OM approves.
-- Date    : 2026-07-11
-- Spec    : ds-app-endorsement-hiring (FR-011, DEC-003, Q-005)
-- Tables  : ds.tmc_team_member_change_requests
-- Notes   : Idempotent. created_by/reviewed_by reference ds.tbl_users.usr_id.
--           tmc_changes is a JSONB diff: { field: { old, new }, ... }.
-- ============================================================

CREATE TABLE IF NOT EXISTS ds.tmc_team_member_change_requests (
  tmc_id             SERIAL PRIMARY KEY,
  tms_id             INTEGER      NOT NULL REFERENCES ds.tbl_team_members(tms_id),
  tmc_type           VARCHAR(20)  NOT NULL DEFAULT 'edit',       -- 'edit' | 'attrition'
  tmc_status         VARCHAR(20)  NOT NULL DEFAULT 'Pending',    -- 'Pending' | 'Approved' | 'Rejected'
  tmc_changes        JSONB        NOT NULL DEFAULT '{}',         -- { field: { old, new } }
  tmc_requested_by   INTEGER      NOT NULL REFERENCES ds.tbl_users(usr_id),
  tmc_requested_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  tmc_reviewed_by    INTEGER      REFERENCES ds.tbl_users(usr_id),
  tmc_reviewed_at    TIMESTAMP WITH TIME ZONE,
  tmc_review_comment TEXT
);

CREATE INDEX IF NOT EXISTS idx_tmc_change_requests_tms_id
  ON ds.tmc_team_member_change_requests (tms_id);

CREATE INDEX IF NOT EXISTS idx_tmc_change_requests_status
  ON ds.tmc_team_member_change_requests (tmc_status);

CREATE INDEX IF NOT EXISTS idx_tmc_change_requests_requested_by
  ON ds.tmc_team_member_change_requests (tmc_requested_by);

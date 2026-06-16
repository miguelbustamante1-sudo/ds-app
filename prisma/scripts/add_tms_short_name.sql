-- ============================================================
-- Handoff: Add short_name column to ds.tbl_team_members
-- ============================================================
-- Owner:    DB team / Miguel Bustamante
-- Requestor: Pablo Aguilar — UDS refinements §4
-- Date:     2026-06-14
-- Ticket:   UDS refinements backlog — short_name (§4)
--
-- Background:
--   Team member name display currently requires concatenating
--   tms_names + tms_surnames everywhere (30+ call sites).
--   §4 of the Jun-5/Jun-10 review requested a dedicated
--   short_name field derived from the Workday username standard
--   (e.g. "Pablo A." or "P. Aguilar") to improve density in
--   DataGrids, dropdowns, and mobile views.
--
-- After this runs:
--   1. Update ds-app/prisma/schema.prisma to add the field.
--   2. Run `npx prisma generate` (no migrate needed since DDL
--      was applied directly).
--   3. Update TeamMemberDTO in shared/dto/TeamMember.ts.
--   4. Activate getTeamMemberDisplayName() in client/src/lib/utils.ts.
--
-- ============================================================

ALTER TABLE ds.tbl_team_members
  ADD COLUMN IF NOT EXISTS tms_short_name VARCHAR(100) NULL;

COMMENT ON COLUMN ds.tbl_team_members.tms_short_name
  IS 'Optional concise display name derived from Workday username standard (e.g. "Pablo A."). Falls back to tms_names || tms_surnames when NULL.';

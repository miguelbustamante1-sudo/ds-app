-- Purpose: Rename intercompany_bill_rate column to on_call_rate in tmp_team_member_project
-- Date: 2026-06-08
-- Table: ds.tmp_team_member_project
-- Context: intercompany rate concept is deprecated; field remapped to on-call rate per huddle decision

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ds'
      AND table_name = 'tmp_team_member_project'
      AND column_name = 'tmp_intercompany_bill_rate'
  ) THEN
    ALTER TABLE ds.tmp_team_member_project
      RENAME COLUMN tmp_intercompany_bill_rate TO tmp_on_call_rate;
  END IF;
END $$;

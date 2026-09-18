-- ============================================================================
-- Purpose: Create partial unique index on ds.fnd_findings for dedup guarantee
-- Date    : 2026-09-18
-- Issue   : Prisma schema DSL cannot express partial indexes, so db push
--          created a plain index instead. This script adds the constraint
--          the Detect stage upsert logic depends on.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_fnd_open_fingerprint
    ON ds.fnd_findings (fnd_fingerprint)
    WHERE status = 'open';

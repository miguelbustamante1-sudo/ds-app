-- =============================================================================
-- fix_changelog_bad_json_keys.sql
--
-- PURPOSE
--   Retroactively correct rows in ds.toc_timeoff_changelog that were saved
--   with partial Prisma model objects (camelCase keys such as
--   "timeOffStartDate", "timeOffEndDate", "statusId", "categoryId") instead
--   of full DB row snapshots with real column names
--   ("tto_stadat", "tto_enddat", "sta_id", "tot_id", etc.).
--
-- BACKGROUND
--   Until the application-level fix was applied, createTimeOffChangeLog
--   received hand-built partial objects.  The correct behaviour is to snapshot
--   the full row from ds.tbl_tms_time_off before and after every mutation,
--   using the real DB column names.
--
-- ROW TYPES HANDLED
--   CREATE          oldValues IS NULL / '{}'  →  newValues had camelCase keys
--   CANCEL          oldValues had { statusId } only (no date fields)
--   UPDATE          oldValues / newValues had { timeOffStartDate, timeOffEndDate, categoryId }
--
-- RECOVERY STRATEGY
--   All three cases use row_to_json(tto.*) to obtain the correctly-named
--   full snapshot from the live record.  For UPDATE and CANCEL rows the
--   historical "old" values are reconstructed by taking the current row and
--   overriding only the fields that changed, using the partial data that was
--   already captured in the bad log entry.
--
--   UPDATE rows where the record has been modified again after the bad entry
--   cannot be auto-corrected (the current row no longer matches newValues).
--   Those are surfaced by the diagnostic at the end for manual review.
--
-- INSTRUCTIONS FOR DB TEAM
--   1. Run STEP 0 first and review the counts — verify they match expectations.
--   2. Execute STEP 1 → STEP 3 inside the transaction block.
--   3. COMMIT only after reviewing the STEP 4 verification output.
--   4. If anything looks wrong, ROLLBACK and escalate.
-- =============================================================================


-- =============================================================================
-- STEP 0 — Diagnostic (READ-ONLY, run before anything else)
-- =============================================================================

SELECT
    CASE
        WHEN toc.toc_old_values IS NULL
          OR toc.toc_old_values::jsonb = '{}'::jsonb
          OR toc.toc_old_values::jsonb = 'null'::jsonb                           THEN 'CREATE'
        WHEN toc.toc_old_values::jsonb ?  'statusId'
         AND NOT (toc.toc_old_values::jsonb ? 'timeOffStartDate')                THEN 'CANCEL_STATUS_ONLY'
        WHEN toc.toc_old_values::jsonb ?  'timeOffStartDate'
         AND tto.tto_stadat = (toc.toc_new_values::jsonb->>'timeOffStartDate')::date
         AND tto.tto_enddat = (toc.toc_new_values::jsonb->>'timeOffEndDate')::date
                                                                                 THEN 'UPDATE_RECOVERABLE'
        WHEN toc.toc_old_values::jsonb ?  'timeOffStartDate'                     THEN 'UPDATE_UNRECOVERABLE'
        ELSE                                                                          'OTHER'
    END                     AS row_type,
    COUNT(*)                AS total_rows
FROM ds.toc_timeoff_changelog toc
JOIN ds.tbl_tms_time_off      tto ON tto.tto_id = toc.tto_id
WHERE toc.toc_new_values::jsonb ? 'timeOffStartDate'
   OR toc.toc_new_values::jsonb ? 'statusId'
   OR toc.toc_old_values::jsonb ? 'timeOffStartDate'
   OR toc.toc_old_values::jsonb ? 'statusId'
GROUP BY 1
ORDER BY 1;


-- =============================================================================
-- CORRECTIVE UPDATES — wrapped in a single transaction
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 1 — CREATE rows
--   oldValues stays NULL.
--   newValues replaced with the current full row.
--   Safe: creation is the first (and often only) mutation; the current row
--   is the best available snapshot of the record at that moment.
-- ---------------------------------------------------------------------------

UPDATE ds.toc_timeoff_changelog toc
SET    toc_new_values = row_to_json(tto.*)::jsonb,
       -- Normalise oldValues to SQL NULL for clean CREATE entries
       toc_old_values = NULL
FROM   ds.tbl_tms_time_off tto
WHERE  tto.tto_id = toc.tto_id
  AND  (
           toc.toc_old_values IS NULL
        OR toc.toc_old_values::jsonb = '{}'::jsonb
        OR toc.toc_old_values::jsonb = 'null'::jsonb   -- JSON null literal, not SQL NULL
       )
  AND  (
           toc.toc_new_values::jsonb ? 'timeOffStartDate'
        OR toc.toc_new_values::jsonb ? 'statusId'
       );

-- ---------------------------------------------------------------------------
-- STEP 2 — CANCEL-only rows  (only statusId was logged, no dates)
--   newValues  → current full row  (cancelled state; terminal, dates stable)
--   oldValues  → current full row with sta_id patched back to the old status
--               that was already captured in the bad partial log
-- ---------------------------------------------------------------------------

UPDATE ds.toc_timeoff_changelog toc
SET
    toc_new_values = row_to_json(tto.*)::jsonb,
    toc_old_values = row_to_json(tto.*)::jsonb
                     || jsonb_build_object(
                            'sta_id',
                            (toc.toc_old_values::jsonb ->> 'statusId')::int
                        )
FROM ds.tbl_tms_time_off tto
WHERE tto.tto_id = toc.tto_id
  AND toc.toc_old_values::jsonb ?  'statusId'
  AND NOT (toc.toc_old_values::jsonb ? 'timeOffStartDate');

-- ---------------------------------------------------------------------------
-- STEP 3 — UPDATE rows WHERE current state still matches logged newValues
--   (the record has not been modified again since this entry — recoverable)
--   newValues  → current full row
--   oldValues  → current full row with tto_stadat / tto_enddat / tot_id
--                overridden with the old values from the partial log
-- ---------------------------------------------------------------------------

UPDATE ds.toc_timeoff_changelog toc
SET
    toc_new_values = row_to_json(tto.*)::jsonb,
    toc_old_values = row_to_json(tto.*)::jsonb
                     || jsonb_build_object(
                            'tto_stadat', (toc.toc_old_values::jsonb ->> 'timeOffStartDate')::date,
                            'tto_enddat', (toc.toc_old_values::jsonb ->> 'timeOffEndDate')::date,
                            'tot_id',     (toc.toc_old_values::jsonb ->> 'categoryId')::int
                        )
FROM ds.tbl_tms_time_off tto
WHERE tto.tto_id = toc.tto_id
  AND toc.toc_old_values::jsonb ? 'timeOffStartDate'
  AND tto.tto_stadat = (toc.toc_new_values::jsonb ->> 'timeOffStartDate')::date
  AND tto.tto_enddat = (toc.toc_new_values::jsonb ->> 'timeOffEndDate')::date;

-- ---------------------------------------------------------------------------
-- STEP 4 — Verification: confirm no camelCase keys remain after the updates
-- Expected result: 0 rows.  If any rows appear, DO NOT COMMIT — investigate.
-- ---------------------------------------------------------------------------

SELECT
    toc.toc_id,
    toc.tto_id,
    toc.toc_created_at,
    'still has camelCase keys' AS issue
FROM ds.toc_timeoff_changelog toc
WHERE toc.toc_new_values::jsonb ? 'timeOffStartDate'
   OR toc.toc_new_values::jsonb ? 'statusId'
   OR toc.toc_old_values::jsonb ? 'timeOffStartDate'
   OR toc.toc_old_values::jsonb ? 'statusId';

-- If the above returns 0 rows:
COMMIT;

-- If rows are returned above, run ROLLBACK instead and escalate:
-- ROLLBACK;


-- =============================================================================
-- STEP 5 — Post-commit: surface UPDATE rows that could NOT be auto-fixed
--   These are records modified more than once; the intermediate state is
--   lost.  oldValues for these entries will still be partial / camelCase.
--   Review manually and correct case by case.
-- =============================================================================

SELECT
    toc.toc_id,
    toc.tto_id,
    toc.toc_created_at,
    tto.tto_stadat                                               AS current_start,
    tto.tto_enddat                                               AS current_end,
    (toc.toc_new_values::jsonb ->> 'timeOffStartDate')::date     AS log_new_start,
    (toc.toc_new_values::jsonb ->> 'timeOffEndDate')::date       AS log_new_end,
    (toc.toc_old_values::jsonb ->> 'timeOffStartDate')::date     AS log_old_start,
    (toc.toc_old_values::jsonb ->> 'timeOffEndDate')::date       AS log_old_end,
    toc.toc_comment
FROM ds.toc_timeoff_changelog toc
JOIN ds.tbl_tms_time_off      tto ON tto.tto_id = toc.tto_id
WHERE toc.toc_old_values::jsonb ? 'timeOffStartDate'
  AND (
      tto.tto_stadat <> (toc.toc_new_values::jsonb ->> 'timeOffStartDate')::date
   OR tto.tto_enddat <> (toc.toc_new_values::jsonb ->> 'timeOffEndDate')::date
  )
ORDER BY toc.tto_id, toc.toc_created_at;

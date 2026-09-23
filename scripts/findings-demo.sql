-- ============================================================================
-- Findings demo — drift the live snapshot, run the engines, revert, watch it
-- self-resolve.
--
-- Starting point: es.snp_entity_snapshot == ds.aps_approved_state for all 6
-- projects, no findings, rules 1, 3, 4 active (rule 2 turned off).
--
-- Each scenario is DRIFT → click → REVERT → click. Revert queries copy the
-- value back from the approved state, so they restore it exactly.
-- Run one scenario at a time, or several drifts together. Scenarios are
-- independent: each touches a different project.
--
-- Note: uploading a TSV replaces the snapshot, so run RESET ALL (bottom)
-- afterwards if you want the clean state back.
-- ============================================================================


-- ── See what the Findings screen will show ──────────────────────────────────
SELECT f.fnd_id, f.fnd_entity_id, f.cdf_field_path,
       CASE WHEN f.rul_id IS NULL THEN 'change: ' || f.change_type
            ELSE 'rule #' || f.rul_id || ': ' || r.rul_type END AS raised_by,
       f.old_value, f.new_value, f.status, f.occurrence_count
  FROM ds.fnd_findings f
  LEFT JOIN ds.rul_detection_rules r USING (rul_id)
 ORDER BY f.fnd_id;


-- ════════════════════════════════════════════════════════════════════════════
-- Scenario 1 — Rule 1: Director must be filled in              (PR-004121)
--   Run Rules    → rule #1 violation, New Value "(missing)"
--   Run Findings → change finding too: director is a watched field (modified)
-- ════════════════════════════════════════════════════════════════════════════

-- DRIFT
UPDATE es.snp_entity_snapshot
   SET snp_payload = jsonb_set(snp_payload, '{director}', '""')
 WHERE snp_entity_type = 'project' AND snp_entity_id = 'PR-004121';

-- REVERT  → Run Rules + Run Findings: both findings become Self Resolved
UPDATE es.snp_entity_snapshot s
   SET snp_payload = jsonb_set(s.snp_payload, '{director}', a.aps_payload -> 'director')
  FROM ds.aps_approved_state a
 WHERE a.cde_entity_type = s.snp_entity_type AND a.aps_entity_id = s.snp_entity_id
   AND s.snp_entity_id = 'PR-004121';


-- ════════════════════════════════════════════════════════════════════════════
-- Scenario 2 — Rule 3: Project Underrun between 0 and 1,000,000 (PR-004156)
--   Run Rules    → rule #3 violation, New Value 2500000
--   Run Findings → nothing: Project_Underrun__c is an INACTIVE watched field,
--                  so only the rules engine sees it (good contrast)
-- ════════════════════════════════════════════════════════════════════════════

-- DRIFT
UPDATE es.snp_entity_snapshot
   SET snp_payload = jsonb_set(snp_payload, '{Project_Underrun__c}', '"2500000"')
 WHERE snp_entity_type = 'project' AND snp_entity_id = 'PR-004156';

-- REVERT  → Run Rules: Self Resolved
UPDATE es.snp_entity_snapshot s
   SET snp_payload = jsonb_set(s.snp_payload, '{Project_Underrun__c}', a.aps_payload -> 'Project_Underrun__c')
  FROM ds.aps_approved_state a
 WHERE a.cde_entity_type = s.snp_entity_type AND a.aps_entity_id = s.snp_entity_id
   AND s.snp_entity_id = 'PR-004156';


-- ════════════════════════════════════════════════════════════════════════════
-- Scenario 3 — Rule 4: Billable must be true — wrong value      (PR-005460)
--   Run Rules    → rule #4 violation, New Value false
--   Run Findings → change finding: "true" → "false" (modified)
-- ════════════════════════════════════════════════════════════════════════════

-- DRIFT
UPDATE es.snp_entity_snapshot
   SET snp_payload = jsonb_set(snp_payload, '{pse__Is_Billable__c}', '"false"')
 WHERE snp_entity_type = 'project' AND snp_entity_id = 'PR-005460';

-- REVERT  → Run Rules + Run Findings: both Self Resolved
UPDATE es.snp_entity_snapshot s
   SET snp_payload = jsonb_set(s.snp_payload, '{pse__Is_Billable__c}', a.aps_payload -> 'pse__Is_Billable__c')
  FROM ds.aps_approved_state a
 WHERE a.cde_entity_type = s.snp_entity_type AND a.aps_entity_id = s.snp_entity_id
   AND s.snp_entity_id = 'PR-005460';


-- ════════════════════════════════════════════════════════════════════════════
-- Scenario 4 — Rule 4: Billable must be true — value missing   (PR-005988)
--   Run Rules    → rule #4 violation, New Value "(missing)"
--                  (a missing value counts as a violation for must-equal)
--   Run Findings → change finding: value removed (deleted)
-- ════════════════════════════════════════════════════════════════════════════

-- DRIFT (removes the key entirely, like a column missing from the upload)
UPDATE es.snp_entity_snapshot
   SET snp_payload = snp_payload - 'pse__Is_Billable__c'
 WHERE snp_entity_type = 'project' AND snp_entity_id = 'PR-005988';

-- REVERT  → Run Rules + Run Findings: both Self Resolved
UPDATE es.snp_entity_snapshot s
   SET snp_payload = jsonb_set(s.snp_payload, '{pse__Is_Billable__c}', a.aps_payload -> 'pse__Is_Billable__c')
  FROM ds.aps_approved_state a
 WHERE a.cde_entity_type = s.snp_entity_type AND a.aps_entity_id = s.snp_entity_id
   AND s.snp_entity_id = 'PR-005988';


-- ════════════════════════════════════════════════════════════════════════════
-- Scenario 5 (optional) — a turned-off rule does not fire      (PR-004141)
--   PR-004141 has no business unit; give it one.
--   Run Rules    → nothing: rule #2 (BU must be empty) is turned off
--   Run Findings → change finding: null → "CIO" (added)
--   Bonus: turn rule #2 back on in Detection Rules, Run Rules → it fires.
--          Turn it off again → the finding closes as Rule Retired.
-- ════════════════════════════════════════════════════════════════════════════

-- DRIFT
UPDATE es.snp_entity_snapshot
   SET snp_payload = jsonb_set(snp_payload, '{telus_business_unit}', '"CIO"')
 WHERE snp_entity_type = 'project' AND snp_entity_id = 'PR-004141';

-- REVERT  → Run Findings: Self Resolved
UPDATE es.snp_entity_snapshot s
   SET snp_payload = jsonb_set(s.snp_payload, '{telus_business_unit}', a.aps_payload -> 'telus_business_unit')
  FROM ds.aps_approved_state a
 WHERE a.cde_entity_type = s.snp_entity_type AND a.aps_entity_id = s.snp_entity_id
   AND s.snp_entity_id = 'PR-004141';


-- ════════════════════════════════════════════════════════════════════════════
-- RESET ALL — snapshot back to the approved state for every project.
-- Open findings then self-resolve on the next Run Rules / Run Findings.
-- Add the DELETE only if you want an empty table again (not audited).
-- ════════════════════════════════════════════════════════════════════════════

UPDATE es.snp_entity_snapshot s
   SET snp_payload = a.aps_payload
  FROM ds.aps_approved_state a
 WHERE a.cde_entity_type = s.snp_entity_type AND a.aps_entity_id = s.snp_entity_id;

-- DELETE FROM ds.fnd_findings;

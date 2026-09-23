-- ============================================================================
-- Purpose: Evaluate active state rules against the latest entity snapshots,
--          upsert violations into ds.fnd_findings, and self-resolve open rule
--          findings whose value now passes
-- Date    : 2026-09-23
-- Tables  : reads ds.rul_detection_rules, es.snp_entity_snapshot
--           writes ds.fnd_findings
-- Called  : POST /api/findings/run-rules (FindingsOrchestrator.runStateRules)
-- Depends : prisma/scripts/rekey_fnd_open_dedup_index_by_rule.sql — the
--           ON CONFLICT target below must match uq_fnd_open_entity_field.
-- Note    : Dedup is keyed on the columns, not the fingerprint (the fingerprint
--           index was dropped on 2026-09-18). The fingerprint is still written
--           for readability only. Only rul_class = 'state' is evaluated here;
--           'change' rules belong to the change-detection run.
--           2026-09-23: fixed RETURN QUERY type mismatch (rul_type varchar vs
--           text) that failed the function on its first violation.
--           2026-09-23: self-resolve. When a rule passes for an entity present
--           in the snapshot, its open finding for that rule is closed as
--           'self_resolved' and returned with finding_action
--           'finding self-resolved'. Entities missing from the snapshot are
--           never resolved (a failed read is not a fix), and findings of
--           inactive rules are left untouched. Return signature unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION ds.fn_run_state_rules()
 RETURNS TABLE(entity_id text, field text, rule_type text, current_value text, finding_action text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    r RECORD;
    s RECORD;
    v_field      text;
    v_min        numeric;
    v_max        numeric;
    v_expected   boolean;
    v_value      text;
    v_violated   boolean;
    v_fingerprint text;
BEGIN
    FOR r IN
        SELECT rul_id, cde_entity_type, rul_type, rul_definition, rul_severity, rul_version
        FROM ds.rul_detection_rules
        WHERE rul_class = 'state' AND rul_active = true
    LOOP
        v_field := r.rul_definition ->> 'field';

        FOR s IN
            SELECT snp_entity_id, snp_payload
            FROM es.snp_entity_snapshot
            WHERE snp_entity_type = r.cde_entity_type
        LOOP
            v_value    := s.snp_payload ->> v_field;
            v_violated := false;

            IF r.rul_type = 'required_not_null' THEN
                v_violated := (v_value IS NULL OR v_value = '');

            ELSIF r.rul_type = 'required_empty' THEN
                v_violated := (v_value IS NOT NULL AND v_value <> '');

            ELSIF r.rul_type = 'range_check' THEN
                v_min := (r.rul_definition ->> 'min')::numeric;
                v_max := (r.rul_definition ->> 'max')::numeric;
                IF v_value IS NOT NULL AND v_value <> '' THEN
                    v_violated := (v_value::numeric < v_min OR v_value::numeric > v_max);
                END IF;
                -- a missing value doesn't trip a range check — nothing to compare.
                -- required_not_null is the rule that should own "must be filled."

            ELSIF r.rul_type = 'boolean_equals' THEN
                v_expected := (r.rul_definition ->> 'expected')::boolean;
                IF v_value IS NOT NULL AND v_value <> '' THEN
                    v_violated := (v_value::boolean IS DISTINCT FROM v_expected);
                ELSE
                    v_violated := true; -- missing on a must-equal check counts as a violation
                END IF;
            END IF;

            IF v_violated THEN
                v_fingerprint := r.cde_entity_type || ':' || s.snp_entity_id || ':rule:' || r.rul_id;

                INSERT INTO ds.fnd_findings
                    (fnd_fingerprint, cde_entity_type, fnd_entity_id, cdf_field_path,
                     rul_id, rul_version, change_type, new_value, severity, status)
                VALUES
                    (v_fingerprint, r.cde_entity_type, s.snp_entity_id, v_field,
                     r.rul_id, r.rul_version, NULL, to_jsonb(v_value), r.rul_severity, 'open')
                ON CONFLICT (cde_entity_type, fnd_entity_id, cdf_field_path, rul_id) WHERE status = 'open'
                DO UPDATE SET last_seen = now(), occurrence_count = fnd_findings.occurrence_count + 1;

                -- Explicit casts: rul_type is varchar(100) and RETURN QUERY requires exact types.
                RETURN QUERY SELECT s.snp_entity_id::text, v_field, r.rul_type::text, v_value, 'finding opened/updated'::text;
            ELSE
                UPDATE ds.fnd_findings
                   SET status      = 'self_resolved',
                       resolved_at = now(),
                       resolution  = 'auto: rule no longer violated'
                 WHERE cde_entity_type = r.cde_entity_type
                   AND fnd_entity_id   = s.snp_entity_id
                   AND rul_id          = r.rul_id
                   AND status          = 'open';

                IF FOUND THEN
                    RETURN QUERY SELECT s.snp_entity_id::text, v_field, r.rul_type::text, v_value, 'finding self-resolved'::text;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$function$;

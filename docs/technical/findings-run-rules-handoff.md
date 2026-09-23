# Findings "Run Rules": spec vs. what was built

**Date:** 2026-09-23 · **Branch:** `certinia-watcher` · **Status:** working locally, **not committed**, DB scripts not yet handed to the DB team.

This note is for a fresh session that has none of the original context. It covers what the original brief asked for, what was built, where and why the work drifted from the brief, and what's still open.

---

## 1. What the original brief asked for

Add a second detection engine to the existing Findings screen, as app-layer wiring only:

1. **`POST /findings/run-rules`**: a thin route. The service calls `SELECT * FROM ds.fn_run_state_rules()`, which is assumed to already exist and work. It writes one batch-level audit entry, returns `{ data: { violationsFound, details } }`, and throws an `AppError` subclass on failure.
2. **A "Run Rules" button** next to the existing "Run Findings" button. It uses the same loading pattern and refreshes the same findings table.
3. **Optional:** a badge that tells rule-based findings apart from diff-based ones.

Explicitly **out of scope**: changes to `POST /findings/run` (the change / diff engine), a rules screen, rule editing, self-resolve for rule findings, and `rul_class = 'change'`.

Test plan in the brief: running it twice creates no duplicates, and dedup relies on "the partial unique index on `fnd_fingerprint WHERE status = 'open'`".

---

## 2. What was achieved

| Item | Status |
|---|---|
| `POST /api/findings/run-rules` (thin route → `findingsOrchestrator.runStateRules()` → repository `$queryRaw`) | Done |
| Batch-level audit entry per run | Done (deviations in §3.4) |
| `{ data: { violationsFound, details } }` envelope, HTTP 201 | Done |
| `StateRulesRunError extends AppError` | Done |
| "Run Rules" button, same spinner pattern, refreshes table and status counts | Done |
| Optional "Rule" badge | Done |
| Two rule findings on the same field (a change finding and a rule finding) no longer collide | Done. This needed DB changes (§3.1) |
| Re-running produces no duplicates (`occurrence_count` increments) | Verified in SQL |
| Fresh DB setups get the rules, function and index | Done via `scripts/seed.sql` |

Verification:
- **Function against a fake snapshot** (inside a transaction that was rolled back): all 4 rules fired. A rule finding on `director` coexisted with an open change finding on `director`. A second run bumped each rule finding's `occurrence_count` to 2 and added no rows.
- **Seed block**: ran twice on a simulated empty rules table (also rolled back). The first pass inserted 4 rules; the second inserted 0, so it's safe to re-run.
- **Server type-check**: 48 errors, the same number as before the change. All are in unrelated workflow and time-off files and look like an out-of-date Prisma client. None are in the findings code.
- **Client type-check**: no findings errors.
- **Tests**: the findings and audit tests pass.
- **App container**: rebuilt with `docker compose -f docker-compose.local.yml up -d --build --no-deps app`, so the DB container was not touched. `POST /api/findings/run-rules` responds (401 without auth).
- **Not done**: a click-through in the browser. The local `es.snp_entity_snapshot` is empty, so the button currently reports 0 violations.

---

## 3. Where we drifted from the brief, and why

### 3.1 The dedup index the brief relied on no longer exists by design (biggest drift)

**The brief assumed** `ds.fn_run_state_rules()` dedups via a partial unique index on `fnd_fingerprint WHERE status = 'open'`.

**Reality:** commit `a0f355c` (2026-09-18) deliberately dropped `uq_fnd_open_fingerprint`. The change engine's fingerprint is `md5(entity_type:entity_id:field_path:new_value)`, so it changes whenever the drifted value changes and can't guarantee one open finding per field. It was replaced by:

```sql
uq_fnd_open_entity_field ON ds.fnd_findings (cde_entity_type, fnd_entity_id, cdf_field_path)
  NULLS NOT DISTINCT WHERE status = 'open'
```

**Consequences for the function as it was:**
1. `ON CONFLICT (fnd_fingerprint) WHERE status = 'open'` has no matching index, so the first violation fails with *"there is no unique or exclusion constraint matching the ON CONFLICT specification"*.
2. Even with a matching conflict target, a rule finding on a field that already had an open change finding (e.g. `director`) would hit `uq_fnd_open_entity_field` and roll back the whole run.

**Fix (the user chose this design):** use `rul_id` as the discriminator in the existing index, instead of adding a new flag column. Change-engine findings always have `rul_id = NULL`, and `NULLS NOT DISTINCT` keeps them at one open finding per field, which the supersede logic depends on. Rule findings get one open finding per (entity, field, rule), so two rules on the same field don't collide either.

```sql
-- prisma/scripts/rekey_fnd_open_dedup_index_by_rule.sql (runs in one transaction)
DROP INDEX IF EXISTS ds.uq_fnd_open_entity_field;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fnd_open_entity_field
    ON ds.fnd_findings (cde_entity_type, fnd_entity_id, cdf_field_path, rul_id)
    NULLS NOT DISTINCT
    WHERE status = 'open';
```

The new key is strictly finer than the old one, so existing rows can't violate it. The script contains a `DROP INDEX`; the repo's migration rules require DROPs to be called out to the DB team.

### 3.2 The SQL function was modified (the brief said it already existed and worked)

The function wasn't in the repo. It's now saved as `prisma/scripts/fn_run_state_rules.sql`, taken from the live DB and verified identical to it. Two changes were made:

1. **Conflict target** re-pointed to the new index:
   `ON CONFLICT (cde_entity_type, fnd_entity_id, cdf_field_path, rul_id) WHERE status = 'open'`.
   The fingerprint (`project:<id>:rule:<rul_id>`) is still written, but only as a readable label.
2. **Latent type bug:** `RETURNS TABLE(... rule_type text ...)`, but `rul_type` is `varchar(100)`, and `RETURN QUERY` requires exact types. The function would have failed on its first violation. It had never failed before because it had never had a violation. Fixed with casts: `s.snp_entity_id::text, ..., r.rul_type::text`.

Applied to the local DB only, directly via `psql`, with no reseed.

### 3.3 The existing change engine was touched (the brief said leave it alone)

The `/findings/run` route and `FindingsOrchestrator.runFindings` are unchanged. One repository query changed:

```ts
// src/services/findings/repository.ts — getOpenFindingRefs
where: { entityType, status: 'open', ruleId: null },
```

**Why it was necessary:** the change engine loads every open finding and keys them by (entity, field). Without this filter, an open rule finding on a watched field (e.g. `director`) would be treated as the change engine's own finding. It could be self-resolved, superseded or recurred. The index change alone doesn't prevent that.

### 3.4 Audit-entry details differ from the brief

| Brief | Built | Reason |
|---|---|---|
| `createdBy` from `req.user.dsUserId` | `req.user.email` | The repo rule (`Governance/06_AUTH_AND_REQUEST_USER_RULES.md`) says to use email for audit `createdBy`, and the existing `/run` route does the same. A one-line change if the brief's intent wins. |
| `entityName: 'ds.fnd_findings'` | `'fnd_findings'` | The repo rule says to use the bare `@@map` table name, matching existing audit rows. |
| `newValues` = the rows array cast to `Record` | `{ violationsFound, rows }` | A real object instead of an array forced through a cast. |
| `entityId: 'state-rules-run'`, comment `` `${n} state-rule violations evaluated` `` | Same | |

**Granularity** (the brief asked to flag this): batch-level is kept. Per-row entries wouldn't add much, because the function returns no `fnd_id` and doesn't say whether each row was an insert or an update (`finding_action` is always `'finding opened/updated'`).

### 3.5 Error handling

`StateRulesRunError` (in `src/services/findings/errors.ts`) wraps any failure of the function call, with status **500**. The brief wanted an `AppError` subclass. Repo guidance says not to throw 500 on purpose, but a failure inside the Postgres function is an infrastructure failure, and `ConfigurationError` already sets that precedent.

### 3.6 Additions beyond the brief

- **`GET /api/findings`** now returns a `rulId: number | null` field on each finding (needed for the badge). The change is additive.
- **Type column:** shows a "Rule" badge (`info` variant) when `rulId !== null`. Rule findings have no `change_type`.
- **Field column:** falls back to the raw `cdfFieldPath` when there's no watched-field display name. Otherwise rule fields that aren't watched, like `Project_Underrun__c` and `pse__Is_Billable__c`, would show "—".
- **Buttons:** each disables the other while running, so the two engines never write at the same time.
- **Response types:** `StateRuleViolationDto` (snake_case, exactly as the function returns it) and `RunStateRulesResultDto`, added to both `shared/dto/Finding.ts` and `src/services/findings/types.ts`.
- **`scripts/seed.sql`** now contains:
  - the new index definition (replacing the old one);
  - the 4 rule rows, with explicit `rul_id`s 1–4 and `ON CONFLICT (rul_id) DO NOTHING`, then a `setval` on the ID sequence, and `rul_created_by = 'system_seed'`;
  - the function, placed after the index it depends on.

---

## 4. The four seeded rules (for reference)

| rul_id | rul_type | definition | Fires when |
|---|---|---|---|
| 1 | required_not_null | `{"field": "director"}` | the value is null or empty |
| 2 | required_empty | `{"field": "telus_business_unit"}` | the value is present |
| 3 | range_check | `{"field": "Project_Underrun__c", "min": 0, "max": 1000000}` | the value is outside the range (a missing value does **not** fire) |
| 4 | boolean_equals | `{"field": "pse__Is_Billable__c", "expected": true}` | the value isn't `true`, **or is missing** |

All are `rul_class = 'state'`, `entity_type = 'project'`, severity `medium`.

---

## 5. Open items / known limitations

1. **DB team handoff:** run `rekey_fnd_open_dedup_index_by_rule.sql` **before** `fn_run_state_rules.sql`, or the function breaks again. Call out the `DROP INDEX`.
2. **Nothing is committed.** `package-lock.json` was already modified before this work and isn't part of it.
3. **Findings of switched-off rules stay open.** Self-resolve was added later (§7), but the function only evaluates active rules, so switching a rule off leaves its open findings as they are. Deliberately left undecided.
4. **One bad value aborts the whole run.** `range_check` casts with `v_value::numeric` and `boolean_equals` with `v_value::boolean`. A non-numeric or non-boolean value in the snapshot raises an error and rolls back the entire run, returned as `StateRulesRunError` with status 500.
5. **Audit identity:** confirm email (current) vs. `dsUserId` (the brief) for `createdBy`.
6. **No end-to-end UI test yet.** Load snapshot data (TSV upload) into `es.snp_entity_snapshot`, then run the brief's test plan. Step 4 (no duplicates) now depends on the `(entity, field, rul_id)` index, not the fingerprint.

---

## 6. Files touched

**New**
- `prisma/scripts/rekey_fnd_open_dedup_index_by_rule.sql`: index re-key
- `prisma/scripts/fn_run_state_rules.sql`: function (conflict target + cast fix)
- `src/services/findings/errors.ts`: `StateRulesRunError`

**Modified**
- `src/routes/findings.routes.ts`: `POST /run-rules`
- `src/services/findings/FindingsOrchestrator.ts`: `runStateRules()`
- `src/services/findings/repository.ts`: `runStateRules()`; `ruleId: null` filter in `getOpenFindingRefs`; `ruleId` returned by `getFindings`
- `src/services/findings/types.ts`, `shared/dto/Finding.ts`: `rulId` on `FindingDto`; the two new response types
- `client/src/pages/maintenance/findings/index.tsx`: button, badge, field fallback
- `scripts/seed.sql`: index, rule rows, function

---

## 7. Follow-up (same day): self-resolve and a readable rule column

Added after the user asked for it. Self-resolve had been explicitly out of scope in the original brief. **No DB model change**: it uses the existing `status`, `resolved_at` and `resolution` columns and the existing `detectionRule` relation. Only the function body changed, and its return signature is the same, so `CREATE OR REPLACE` is enough.

**Function** (`prisma/scripts/fn_run_state_rules.sql`, mirrored verbatim into `scripts/seed.sql`):
- When a rule **passes** for an entity present in the snapshot, the open finding for that (entity, rule) is closed. It gets `status = 'self_resolved'`, `resolved_at = now()` and `resolution = 'auto: rule no longer violated'`, and comes back with `finding_action = 'finding self-resolved'`.
- Entities **missing** from the snapshot are never resolved (a failed read is not a fix, same as the change engine).
- If the value breaks again later, a **new** open finding is created and the resolved one stays resolved, matching the change engine's history.
- Verified in a rolled-back transaction: PR-006119 / `pse__Is_Billable__c` (uploaded as `"true"`) self-resolved; a second run resolved nothing more; flipping the value to `"false"` opened a new finding.

**API:** `RunStateRulesResultDto` gains `findingsResolved`. `violationsFound` now counts only violation rows, and `details` holds both kinds. The audit entry records both counts. `FindingDto` gains `rulType` and `rulDefinition` (from the `detectionRule` relation).

**Screen:**
- A new **Rule** column shows a plain-English description ("Must be filled in", "Must be empty", "Must be between 0 and 1,000,000", "Must be true") with `Rule #<id> · <rul_type>` underneath.
- **New Value** shows "(missing)" for rule findings where the field was absent from the snapshot.
- The toast reports violations and resolved counts.

---

## 8. Follow-up (same day): Detection Rules maintenance screen

A simple screen to create and edit state rules and turn them on or off, at `/maintenance/detection-rules`. It's linked from the Maintenance hub, next to Findings. **No DB model change.**

User decisions:
- **No delete.** Findings reference rules with `ON DELETE RESTRICT`; turning a rule off keeps the history.
- **Turning a rule off closes its open findings** as `status = 'rule_retired'` (`resolution = 'auto: rule deactivated'`, with `resolved_by` set). This happens in the same transaction and each finding gets an audit entry. The UI asks for confirmation when the rule has open findings.
- **Permission:** reuses the `Findings` RBAC resource (read for GET, create for writes).

API (`src/routes/detectionRules.routes.ts` → `src/services/detection-rules/`):
- `GET /api/detection-rules`: `rul_class = 'state'` rules only, each with its `openFindingCount`.
- `GET /api/detection-rules/entity-types`: active watched entities.
- `POST /api/detection-rules`, `PUT /api/detection-rules/:ruleId`, `PATCH /api/detection-rules/:ruleId/active`.

Rules enforced by the server:
- `rul_definition` is rebuilt per type by `components/NormalizeRuleDefinition.ts`. Values the SQL casts would fail on (a non-numeric min/max, a non-boolean expected) are rejected up front.
- **The field can't change** after create (open findings are keyed by it), and neither can the entity type.
- **Duplicates:** creating a second *active* rule of the same type on the same field is rejected with 409.
- **Versioning:** any change to the rule type or definition bumps `rul_version`. Open findings are re-checked on the next "Run Rules" and self-resolve if they now pass. Changing only the severity doesn't bump it.

Other changes:
- `vitest.config.mts` now maps `@shared`, which tests needed to import server code that uses `@shared/dto`.
- New unit tests for the definition normalizer.

Verified:
- Server type-check: same 48 unrelated errors.
- Client type-check (`tsc -p tsconfig.app.json`): 14 unrelated errors, none in touched files. Earlier "client type-check" claims in this note ran `tsc -p .`, which checks no files because the root config only holds references.
- Full vitest suite: 44 passing.
- Live API (dev login): the list and entity-type endpoints return correct data. Changing the field, a non-numeric min and a duplicate rule are all rejected.

**Not yet exercised live:** a successful edit and turning a rule off (the retire path), because both write permanent audit rows.

Known nit: `StateRuleViolationDto` keeps the function's snake_case column names, which `shared/dto/CLAUDE.md` discourages.

---

## 9. Demo reset (same day)

- **Rule 2 turned off** (via the API, audited): `telus_business_unit` "must be empty" contradicts the real CIO/TCS values. Its 5 open findings were retired. The seed now also creates it inactive.
- **Local DB reset:**
  - all findings deleted;
  - the approved state gained passing values for `Project_Underrun__c` (0–150,000, as strings) and `pse__Is_Billable__c` (`"true"`);
  - the snapshot was set equal to the approved state.
  Both engines then produced 0 findings.
- **`scripts/findings-demo.sql`**: five drift/revert scenarios (rules 1, 3 and 4, a missing value, and a turned-off rule), each verified with a real run of both engines and then cleaned up.
- **`scripts/seed.sql`**:
  - the approved-state JSON now includes the two new fields, regenerated from the live DB;
  - both fields are added as watched fields (`Project_Underrun__c` inactive, `pse__Is_Billable__c` active);
  - rule 2 is seeded inactive.

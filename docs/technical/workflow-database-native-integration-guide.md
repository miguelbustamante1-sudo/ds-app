# How-To: Add a DATABASE-Execution-Type Workflow

**Audience:** backend devs who want an existing mutation to go through a review/authorization step, configured in the database instead of shipped as a TypeScript outcome handler.

**Prerequisite reading:** [`workflow-engine.md`](./workflow-engine.md) — especially [§11a](./workflow-engine.md#11a-domain-side-effects--database-execution-type) — and [`workflow-domain-integration-guide.md`](./workflow-domain-integration-guide.md), which covers the `CODE`-execution-type path this guide is an alternative to. Read that one first if you haven't; this guide assumes you already know `businessReferenceType`, template vs. instance, and `triggersOutcomeAction` from it.

This guide walks through the one `DATABASE`-execution-type integration that ships today: Team Member Change Authorization. Editing a team member (`updateTeamMember.ts`) applies the change immediately, then starts a workflow task asking a reviewer to authorize it. `APPROVED` does nothing further — the change already happened. `REJECTED` reverts it. Every file and procedure named below is real; read them alongside this guide.

---

## 0. Which flavor of DATABASE execution type is this?

The engine design (`documents/superpowers/specs/2026-09-18-workflow-database-native-execution-type-design.md`) anticipates two shapes:

1. **Fully DB-native** — a database trigger or another stored procedure starts the workflow, with no TypeScript anywhere on that call path. Nobody has built this yet.
2. **TS-triggers, DB-executes** — TypeScript still performs the domain mutation (because that's where the mutation already lives) and still calls `auditOrchestrator.log(...)` for it, but instantiation, the outcome's side effect, routing, and completion are all handled by stored procedures instead of a TS outcome handler.

Team Member Change Authorization is shape 2, and it's almost certainly what you want too if you're retrofitting an existing TS mutation. This guide covers that shape. If you genuinely need shape 1 (nothing in the call path can depend on TypeScript being reachable), most of this still applies — you'd just move the instantiate call out of TypeScript and into a database trigger.

---

## 1. Decide these things first

1. **`businessReferenceType`** — the string key tying the instance back to your record. Team Member's is `'TeamMember'`. Pick one; it must be unique across the app.
2. **Which domain owns the new files** — per [Governance/02_BACKEND_ARCHITECTURE.md](../../Governance/02_BACKEND_ARCHITECTURE.md), everything lives under `src/services/[domainName]/`.
3. **Apply-then-revert, or hold-then-apply?** Two established patterns now exist:
   - **Apply immediately, revert on reject** (Team Member Change Authorization). The mutation happens right away and is audited normally; `REJECTED` reverts it. Use this when the mutation is low-risk to apply speculatively and you have a reliable way to revert it (see §4).
   - **Hold until approved** (Time Off's exception-authorization flow, `CODE`-type). The record is saved in an interim status and only reaches its real status once approved; `REJECTED` just leaves it as-is. Use this when applying-then-reverting would have side effects you can't cleanly undo (an email already sent, a downstream system already notified).
4. **Who resolves the reviewer, and where.** Every task on a `DATABASE`-type template must be `assignmentType: CONTEXT` — there's no `DYNAMIC`/`ROLE` algorithm available. Decide who the assignee is, and put that decision **inside the stored procedure**, not in TypeScript. Team Member Change Authorization currently hardcodes a placeholder `usr_id` inside `sp_start_team_member_change_auth` for exactly this reason — the whole point of `DATABASE` execution type is that this kind of config lives in the database, so changing the reviewer later is a procedure edit, not a code deploy. If TypeScript computed the assignee and passed it in as a parameter, you'd have quietly reintroduced a code dependency for something meant to be DB-owned.
5. **The outcome codes and what each does to the data** — write this down before touching code, same as the `CODE`-type guide says. Team Member Change Authorization's table:

   | Outcome code | Meaning | Mutation |
   |---|---|---|
   | `APPROVED` | Change authorized | None — already applied and audited when the edit happened |
   | `REJECTED` | Change denied | Revert the changed columns to their pre-edit values |

---

## 2. Author the workflow template (admin UI, not code)

Same as the `CODE`-type flow — authoring stays in `/admin/workflow/templates` regardless of execution type. For a `DATABASE`-type template:

1. Create the template. Set **Execution Type** to `DATABASE` and **Instantiate Procedure Name** to whatever you're about to write in §3 (e.g. `sp_start_team_member_change_auth`).
2. Add one task. Set **Assignment Type** to `CONTEXT` — this is enforced at publish time (`ValidateExecutionType.ts`); any other assignment type on a `DATABASE`-type template fails to publish.
3. Add your outcomes. For each one that needs a `DATABASE`-type side effect, set its own **Execution Type** to `DATABASE` and **Outcome Procedure Name** to whatever you're about to write in §5. (A `CODE`-type template can mix in individual `DATABASE`-type outcomes; a `DATABASE`-type template cannot mix in `CODE`-type ones — publish rejects that combination.)
4. **No routes, no dependencies**, if your flow is a single review step like this one. `DATABASE`-type templates don't support `PARALLEL_JOIN` dependencies at all (also enforced at publish).
5. Publish. Publishing checks both proc names against `pg_proc` — if either doesn't exist yet, publish fails with a clear error rather than deploying a broken template. This also means you can use "does it publish" as a quick way to confirm the DB team's script landed.

---

## 3. The instantiate procedure

This is the domain-specific equivalent of `StartExceptionAuthorization.ts` from the `CODE`-type guide, except it's SQL, and it usually does less than you'd expect — because the domain mutation already happened in TypeScript before this procedure is ever called.

**Three shared primitives do the mechanical work**, already deployed by the original `DATABASE` execution type rollout — don't reimplement them:

- `ds.sp_engine_create_instance(...)` — creates the `WinWorkflowInstance` row.
- `ds.sp_engine_insert_task(...)` — creates one `WitWorkflowInstanceTask` row for a named step, resolving its `CONTEXT` assignee directly in the same `INSERT`.
- `ds.sp_engine_complete_instance_if_done(...)` — the outcome procedure's job (§5), not the instantiate procedure's.

Your instantiate procedure's job is everything domain-specific:

```sql
CREATE OR REPLACE FUNCTION ds.sp_start_team_member_change_auth(
  p_wfl_id            uuid,
  p_team_member_id    integer,
  p_owner_user_id     integer,
  p_started_by        text,
  p_created_by        text,
  p_source_aud_id     uuid
)
RETURNS TABLE (win_id uuid, activated_wit_id uuid, activated_user_id integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_win_id            uuid;
  v_activated_wit_id  uuid;
  v_activated_user_id integer;
  v_assignee_user_id  integer := 59;  -- see §1.4 — belongs here, not in TypeScript
BEGIN
  v_win_id := ds.sp_engine_create_instance(
    p_wfl_id                  := p_wfl_id,
    p_business_reference_type := 'TeamMember',
    p_business_reference_id   := p_team_member_id::text,
    p_owner_user_id           := p_owner_user_id,
    p_started_by              := p_started_by,
    p_created_by              := p_created_by,
    p_context                 := NULL
  );

  -- Pointer to the aud_audits row TypeScript already wrote — see §4.
  INSERT INTO ds.wic_workflow_instance_context (
    wic_id, win_id, wic_key, wic_value_text, created_at, created_by
  ) VALUES (
    gen_random_uuid(), v_win_id, 'sourceAuditId', p_source_aud_id::text, now(), p_created_by
  );

  -- Alias qualification (AS t) matters: this function's own RETURNS TABLE
  -- also declares a column named activated_wit_id, which is otherwise
  -- indistinguishable from sp_engine_insert_task's own column of the same
  -- name here — Postgres raises "column reference is ambiguous" (42702)
  -- without it. This bit every early version of this procedure.
  SELECT t.activated_wit_id, t.activated_user_id
  INTO v_activated_wit_id, v_activated_user_id
  FROM ds.sp_engine_insert_task(
    p_win_id           := v_win_id,
    p_wtk_code         := 'AUTHORIZE_CHANGE',
    p_assignee_user_id := v_assignee_user_id,
    p_performed_by     := p_started_by,
    p_created_by       := p_created_by
  ) AS t;

  RETURN QUERY SELECT v_win_id, v_activated_wit_id, v_activated_user_id;
END;
$$;
```

Note what's absent: no domain `INSERT`, no `aud_audits` write. Both already happened in TypeScript. If you're building the fully-DB-native flavor from §0 instead, your procedure does need both — see `documents/superpowers/specs/2026-09-18-workflow-database-native-execution-type-design.md` §3.6 for that version.

---

## 4. Reverting via `aud_audits`, correctly

If your outcome needs to undo the mutation, don't build a separate snapshot mechanism. `aud_audits` already holds a complete `oldValues`/`newValues` pair from the moment `auditOrchestrator.log(...)` ran for the original change — reuse it, but do it by **reference**, not by copy:

1. Capture the row `auditOrchestrator.log(...)` returns (it's a plain `prisma.audit.create(...)`, so the created row — including its id — comes back for free; most callers discard it).
2. Pass that `aud_id` into your instantiate procedure, which stores it as a `wic_workflow_instance_context` row (`sourceAuditId`, as shown in §3).
3. Your outcome procedure looks up that exact row by id when it needs to revert.

**Why by reference, not by copying the values into `wic` at instantiation time:** a second, unrelated edit could land on the same record while the authorization is pending. Querying "the latest audit row for this entity" at revert time would grab the wrong snapshot; capturing the specific row's id at the moment it was written has no such ambiguity, no matter what else happens to the record in between.

`aud_old_values`/`aud_new_values` are JSON with **camelCase** Prisma field names (`teamMemberNames`, not `tms_names`) — that's whatever the calling TypeScript passed to `auditOrchestrator.log`, not a raw DB row (Time Off's rule 3.12 requiring raw DB rows is Time Off-specific, not a general rule). Your outcome procedure needs an explicit camelCase → column-name map to apply a revert:

```sql
v_column_map jsonb := '{
  "teamMemberNames": "tms_names",
  "teamMemberSurnames": "tms_surnames"
}'::jsonb;
```

Then build the `UPDATE` dynamically, but **whitelist through the map** rather than trusting JSON keys directly as column names:

```sql
SELECT string_agg(format('%I = %L', v_column_map->>key, value), ', ')
INTO v_set_clause
FROM jsonb_each_text(v_old_values) AS kv(key, value)
WHERE v_column_map ? key;   -- only whitelisted keys ever reach a column name

IF v_set_clause IS NOT NULL THEN
  EXECUTE format('UPDATE ds.tbl_team_members SET %s WHERE tms_id = %L', v_set_clause, v_record_id);
END IF;
```

`%I` quotes the column name as an identifier (and it only ever comes from the fixed map — never straight from the JSON key), `%L` quotes each value as a literal that Postgres coerces to the target column's real type on assignment, and `jsonb_each_text` turns a JSON `null` into a real SQL `NULL` (rendered unquoted by `%L`) rather than the literal string `"null"`.

Don't restore bookkeeping columns like `tms_last_updated_by`/`tms_last_upddat` from the old snapshot — stamp those to the reviewer and `now()` instead. The revert is itself a new update, not a trip back in time for who last touched the row.

---

## 5. The outcome procedure

Configured as **Outcome Procedure Name** on whichever outcomes need a `DATABASE`-type side effect (§2.3). One procedure can (and usually should) handle every outcome on the task, branching on `p_outcome_code` — same shape as a `CODE`-type handler branching on `ctx.outcomeCode`.

```sql
CREATE OR REPLACE FUNCTION ds.sp_handle_team_member_change_outcome(
  p_win_id                text,
  p_wit_id                text,
  p_outcome_code          text,
  p_business_reference_id text,
  p_performed_by          text,
  p_performed_by_user_id  text,
  p_params                jsonb
)
RETURNS TABLE (
  activated_wit_id  uuid,
  activated_user_id integer,
  entity_name       text,
  entity_id         text,
  old_values        jsonb,
  new_values        jsonb,
  comment           text
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_outcome_code = 'REJECTED' THEN
    -- revert, per §4 — populate old_values/new_values/entity_name/entity_id/
    -- comment with the live before/after row snapshot
  END IF;
  -- APPROVED, or an unrecognized code: no mutation, no audit — matches
  -- CODE-type handlers' "unrecognized outcome falls through safely" rule.

  PERFORM ds.sp_engine_complete_instance_if_done(
    p_win_id               := p_win_id::uuid,
    p_wit_id               := p_wit_id::uuid,
    p_route_found          := false,  -- no routing on a single-task template
    p_performed_by         := p_performed_by,
    p_performed_by_user_id := p_performed_by_user_id
  );

  RETURN QUERY SELECT NULL::uuid, NULL::integer, v_entity_name, v_entity_id, v_before_row, v_after_row, v_comment;
END;
$$;
```

Two things that are easy to get wrong here:

- **`TaskCompletionOrchestrator` reads `entity_name`/`entity_id`/`old_values`/`new_values`/`comment` off your return row and calls `auditOrchestrator.log(...)` with them automatically**, post-commit — this generic path already exists (`InvokeDatabaseOutcomeProcedure.ts`), you don't write any TypeScript for it. Return `NULL` for these when there's nothing to audit (e.g. `APPROVED`); don't fabricate values just to fill the shape.
- **If your template has routing** (more than one task), your outcome procedure — not `TaskCompletionOrchestrator` — is responsible for querying `wtr_workflow_template_routes`/`wto_workflow_template_task_outcomes` and calling `sp_engine_insert_task` for whatever comes next, and for passing the real `p_route_found` value into `sp_engine_complete_instance_if_done`. See the design spec §4.3/§4.3b for the exact routing query to mirror — it's the same routing data `RoutingEngine.ts` reads for `CODE`-type templates, just read by different code.

---

## 6. The TypeScript wrapper

The instantiate call site — `src/services/teamMember/components/InstantiateTeamMemberChangeAuthWorkflow.ts` — is small on purpose:

```ts
export async function instantiateTeamMemberChangeAuthWorkflow(
  input: InstantiateTeamMemberChangeAuthWorkflowInput,
): Promise<boolean> {
  const template = await prisma.wflWorkflowTemplate.findFirst({
    where: { code: TEMPLATE_CODE, status: 'PUBLISHED' },
    select: { wflId: true, instantiateProcName: true },
  });

  if (!template?.instantiateProcName) {
    console.warn(`...no PUBLISHED template or no instantiateProcName set...`);
    return false;
  }

  try {
    await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM ${Prisma.raw(`ds."${template.instantiateProcName}"`)}(...)`,
    );
    return true;
  } catch (err) {
    console.error(`...failed to start workflow...`, err);
    return false;
  }
}
```

Three points that matter more than they look:

- **Read `instantiateProcName` off the template row you just fetched — don't hardcode it as a TS constant.** The whole premise of `DATABASE` execution type is that this config lives in the database; hardcoding the proc name in TypeScript means repointing it later needs a code deploy after all, defeating the point. The *template code* (`'TEAM_MEMBER_CHANGE_AUTH'`) is the one value this file still hardcodes, because something has to know which template to look up.
- **Never let this fail the caller's actual mutation.** `updateTeamMember.ts` already applied and audited the real change before this function is even called — a missing template, a missing proc name, or a SQL error here must be caught and logged, never thrown. Log with enough detail to tell the three failure modes apart (no published template vs. no proc name set vs. an actual SQL error) — a bare "didn't work" is nearly useless when you come back to debug it later.
- **Wire it in by capturing the audit row you already have.** `updateTeamMember.ts` already calls `auditOrchestrator.log(...)`; keep its return value and pass `.id` through as `sourceAuditId` (§4) instead of discarding it.

---

## 7. (Optional) Show the reviewer what's actually changing

A `DATABASE`-type task has no template-authored inputs to show context — by default the reviewer just sees a generic task name. The engine already exposes a generic mechanism for this that costs nothing when a domain doesn't use it: `GET /instances/:winId/tasks/:witId` flattens every `wic_workflow_instance_context` row for the instance into a plain `context: Record<string, unknown>` on the response (`flattenInstanceContext` in `src/services/workflow/components/`) — the route has no idea what any key means, it just forwards whatever your instantiate/outcome procedure wrote.

Team Member Change Authorization's instantiate procedure computes a field-level diff from the same `aud_audits` row it already has (§4) and writes it under a `changedFields` key, as a JSON array of `{field, oldValue, newValue}`:

```sql
SELECT jsonb_agg(jsonb_build_object(
  'field', diff.field_key,
  'oldValue', v_old_values -> diff.field_key,
  'newValue', v_new_values -> diff.field_key
) ORDER BY diff.field_key)
INTO v_changed_fields
FROM (
  SELECT DISTINCT key AS field_key
  FROM (
    SELECT jsonb_object_keys(v_old_values) AS key
    UNION
    SELECT jsonb_object_keys(v_new_values) AS key
  ) all_keys
  WHERE v_old_values -> key IS DISTINCT FROM v_new_values -> key
) diff;
```

This mirrors the same defensive pattern already used by `ds.vw_timeoff_changelog_activity` (`sql_objects_no_tables/ChangeLogView1.sql`) — union of **both** old and new keys, not just one side, since a field cleared to null could otherwise be missed.

`TaskExecutionDrawer.tsx` renders a "Changes Requested" table when `context.changedFields` is present, and renders nothing when it isn't — every `CODE`-type workflow, and any `DATABASE`-type one that doesn't write this key, is unaffected. This is entirely optional and entirely additive.

---

## 8. Notifications — don't rely on the template builder's notification config

For a `CODE`-type template, an `ON_ASSIGNMENT` notification configured in the builder is already inert in production — `NotificationDispatcher.ts` only `console.warn`s (see [workflow-engine.md §9](./workflow-engine.md#9-notifications)). For a `DATABASE`-type template it's worse than inert: `PendingNotificationScanner.ts` exists to sweep up notifications for DB-created tasks, but it dispatches through that same stubbed `notifyWorkflowEvent`, so configuring one in the builder gives you nothing.

The working option today is calling `com.sp_notify_user(...)` directly from your instantiate or outcome procedure — a small, reusable, non-workflow-specific primitive (it lives in the `com` schema with the tables it writes, not alongside `ds.sp_engine_*`) that inserts straight into `com.ntf_notifications`/`com.rec_recipients`, the same tables the in-app bell already reads:

```sql
PERFORM com.sp_notify_user(
  p_user_id       := v_assignee_user_id,
  p_item_type     := 'workflow-task',
  p_payload       := jsonb_build_object(
    'description', 'A team member change requires your authorization.',
    'taskName', 'Authorize Change',
    'link', '/my-tasks?tab=workflow',
    'isActionable', true
  ),
  p_category_name := 'Inbox',
  p_created_by    := p_started_by
);
```

If your `itemType` isn't one the frontend already renders, add a small item component under `client/src/components/layouts/shared/topbar/notifications/` and register it in `item-mapper.tsx`'s `ITEM_COMPONENTS` map — see `item-workflow-task.tsx` for the shape (a couple of display fields plus a description, nothing more).

If your `link` points at `/my-tasks`, append `?tab=workflow` — `TaskInboxPage.tsx` reads that query param to select the right tab on load (it would otherwise default to whichever tab comes first for that user's permissions).

---

## 9. Verify end-to-end before calling it done

1. Publish the template — this alone confirms both proc names actually exist in the database.
2. Trigger your instantiate call against a real record. Confirm a `WinWorkflowInstance` row appears (`/admin/workflow/instances`) with the right `businessReferenceType`/`businessReferenceId`, and that a notification actually arrives if you wired one up.
3. Complete the task with each outcome in turn:
   - The domain row changed as expected (or didn't, for a no-op outcome).
   - `TaskCompletionOrchestrator`'s generic audit path logged the right `oldValues`/`newValues` — check `aud_audits`, not just the workflow's own audit log.
   - An outcome procedure returning `NULL` for `entity_name` produced no audit entry, confirming the gating is real rather than always-on.
4. Check `GET /instances/:winId/audit-log` for `INSTANCE_STARTED`/`TASK_ACTIVATED`/`TASK_COMPLETED`/`INSTANCE_COMPLETED` — this is the workflow-specific trail (`wal`), separate from `aud_audits`.

---

## Checklist summary

- [ ] Picked a unique `businessReferenceType` and confirmed which domain owns the new files
- [ ] Decided apply-then-revert vs. hold-then-apply, and who resolves the reviewer (in the procedure, not TypeScript)
- [ ] Wrote down the outcome-code → mutation table
- [ ] Authored and **published** the template — `DATABASE` execution type, `CONTEXT` assignment, both proc names set
- [ ] Instantiate procedure — calls `sp_engine_create_instance`/`sp_engine_insert_task`, no domain mutation (TS already did it), watch for the ambiguous-column gotcha in §3
- [ ] Outcome procedure — reads `entity_name`/`old_values`/etc. into its return row for the generic audit path, calls `sp_engine_complete_instance_if_done`, falls through safely on an unrecognized outcome code
- [ ] TS wrapper reads `instantiateProcName` off the template row (not hardcoded), never throws out of the caller's mutation
- [ ] (Optional) Wrote a `changedFields`-style context key for the task drawer
- [ ] Notification wired through `com.sp_notify_user`, not the template builder's notification config
- [ ] Manually verified every outcome path end-to-end, including the audit trail

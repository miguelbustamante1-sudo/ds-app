# Findings Review Workflow: brief vs. what was built

**Date:** 2026-09-23 · **Branch:** `findings-review-workflow` (from `certinia-watcher` @ `8433922`) · **Status:** working and tested locally end to end, **not committed**. The DB scripts haven't been handed to the DB team yet.

Every finding gets a review task in the workflow inbox, assigned to the **project manager** (see §1a), falling back to Milton Ayala. Tasks are created and closed by the same two buttons, "Run Findings" and "Run Rules", in the same request. There's no trigger and no background job.

---

## 1. How it works

| Finding transition | Caused by | Task effect |
|---|---|---|
| new `open` finding | either run | `fn_create_finding_tasks` starts an instance plus a `REVIEW_CHANGE` / `REVIEW_RULE_FLAG` task and sets `win_id` |
| `open` → `approved` | reviewer: **Agree** (change) | baseline advances (`aps_approved_state` via `jsonb_set`); task and instance complete |
| `open` → `acknowledged` | reviewer: **Disagree** (change) / **Mark as Resolved** (rule) | review task ends; a follow-up task (`AWAIT_CHANGE_FIX` / `AWAIT_RULE_FIX`) is inserted, so the work stays in the inbox |
| `acknowledged` → `resolved_confirmed` | a run sees the value fixed | follow-up task closed by `fn_close_resolved_finding_tasks` |
| `open` → `self_resolved` | a run sees the value fixed, never acknowledged | review task closed by the same function |
| `acknowledged` → `approved` | reviewer: **Agree (accept new value)** on the change follow-up | as Agree above |
| `acknowledged` → `dismissed` | reviewer: **Dismiss** on the rule follow-up | task and instance complete |
| → `superseded` | change engine: the value moved again | task closed; the new finding gets its own task |
| → `rule_retired` | rule turned off on the Detection Rules screen | task closed immediately, not on the next run |

`acknowledged` is a **live** status. Both engines keep evaluating it, and the unique index covers it. So a still-wrong acknowledged finding recurs (its `occurrence_count` goes up) instead of opening a duplicate, which would also create a duplicate task.

Both run responses now include `tasksCreated`, `tasksClosed` and `taskSyncError`. Task sync never fails the click: the run's findings are saved first, and a workflow error comes back in `taskSyncError` and shows as a toast.

### 1a. Who gets the task (added 2026-09-25)

`ds.fn_resolve_finding_assignee(entity_type, entity_id)` decides who gets each task:
1. Read `project_manager` from the project's snapshot (falling back to the approved baseline), e.g. `"Kevin Fino Herrera (10017904)"`, and take the Workday ID in the trailing parentheses.
2. Match it to an **active** `ds.tbl_team_members.wdid`. Active uses the app's own rule: `tms_stadat <= today`, and `tms_enddat` null or `>= today`.
3. Take that team member's app user, `ds.tbl_users.usr_id`. The engine keys both the inbox and completion rights on this id (`dsUserId`), so the PM sees the task and can complete it.

If any step fails (no id in parentheses, no active team member, no app user, or a non-project finding), the task goes to Milton Ayala instead. The fallback is looked up by email (`milton.ayala2@telusinternational.com`), so the same code works in every environment: it resolves to `usr_id 311` in production and 1 locally, with 311 hard-coded as the last resort.

- **When it's decided:** when the task is created, from the snapshot at that moment. A PM who changes later doesn't take over tasks that already exist.
- **Follow-up tasks** (Awaiting Fix / Awaiting Confirmation) stay with whoever had the review task.
- **Record:** each instance stores the chosen assignee as `assigneeUserId` in its context.
- **Production check:** `scripts/findings-pm-assignment-check.sql` shows, per project, who a task would go to and why. It also shows whether that user holds the `Workflow` write permission needed to complete tasks. It's read-only.

---

## 2. Where the build differs from the brief, and why

1. **Disagree can't "keep the task open".** The brief's §1 open question, now resolved. `TaskCompletionOrchestrator.complete()` (Step 6) moves the task out of `ACTIVE` for **every** outcome. `wto_is_terminal` only picks `SUCCESS` vs. `FAILED`, and the inbox (`GetTaskInbox.ts`) shows only `ACTIVE`/`PENDING` tasks. Skipping `sp_engine_complete_instance_if_done` keeps the instance open, not the task. **Chosen design (user decision):** the outcome procedure inserts a follow-up task through `sp_engine_insert_task`, the engine's own routing mechanism for DATABASE templates. The brief's flags are kept (`DISAGREE`/`MARK_RESOLVED` are non-terminal), so the finished review task shows as `FAILED` in the workflow history. Flip them to `true` if `SUCCESS` reads better.
2. **Tasks use `CONTEXT` assignment, not `USER`.** Publish rejects any other assignment type on a DATABASE template (`ValidateExecutionType.ts` rule 4). The assignee is resolved inside the procedures instead (§1a), as the integration guide recommends.
3. **Proc names on the templates have no schema prefix** (`sp_start_finding_review_workflow`, not `ds.sp_…`). Both the publish check and the outcome invoker compare against `pg_proc.proname`, and the invoker prepends `ds.` itself.
4. **Each follow-up task has an outcome** (`AGREE` "Agree (accept new value)" on the change follow-up, `DISMISS` on the rule follow-up). With zero outcomes, the drawer shows a free-text code box and a generic Complete button, which would push an unrecognized outcome down the engine's CODE path on a DATABASE template. `DISMISS` and the `dismissed` status are additions to the brief.
5. **Closing a task writes two engine rows directly.** The engine has no primitive for completing a task without a human, and `sp_engine_complete_instance_if_done` returns early while any task is `ACTIVE`. So `fn_close_resolved_finding_tasks` repeats what `TaskCompletionOrchestrator` does for a completed task: Step 6 (the `wit` row, with `wit_outcome_code` = the finding status in upper case) and Step 10 (a `TASK_COMPLETED` entry in `wal`). It then calls the engine primitive for instance completion. It adds no constraints. The clean long-term fix is a `sp_engine_complete_task` primitive from the engine owners.
6. **The unique index predicate changed** to `status IN ('open','acknowledged')`, and the `ON CONFLICT` in `fn_run_state_rules` now matches it. The brief's §5 covered only the self-resolve branch; without this change an acknowledged finding would be duplicated on the next run.
7. **The change engine already had self-resolve** (the brief's §6 flag: yes, since `a0f355c`). The `resolved_confirmed` branch is TypeScript (`ApplyFindingsPlan.ts`, plus `getOpenFindingRefs` now loading `acknowledged`), not SQL.
8. **Agree on a deleted value** writes JSON `null` into the baseline. `jsonb_set(…, NULL)` would null the whole payload and break `aps_payload NOT NULL`. If the entity has no baseline row yet, Agree creates one.
9. **Reviewer comments come from the task row.** `TaskCompletionOrchestrator` always passes `p_params = '{}'`, but it has already written `wit_result_comment` in the same transaction. A `p_params.comment` is still honoured if a future caller sends one.
10. **One audit row per outcome.** The engine audits only the first row an outcome procedure returns. Agree changes both the finding and the baseline, so it audits the baseline change (`aps_approved_state`, id `project:<entity>`), which is the one needed for a revert. The finding's transition is on the row itself (`resolved_by`/`resolved_at`) and in the WAL.
11. **`fn_create_finding_tasks` / `fn_close_resolved_finding_tasks` return rows, not `void`**, so the buttons can report counts and write one batch audit entry each.
12. **`business_reference_type` is `'Finding'`**, PascalCase like `TeamMember` / `Country` / `TimeOffType`, rather than the brief's `'finding'`.
13. **Retired findings close their tasks too**, since `rule_retired` wasn't in the brief's close filter. Turning a rule off closes them immediately.
14. **The reviewer sees context in the drawer.** The start procedure writes a `changedFields` entry (`wic_value_json`), the only context key the task drawer renders. For a change it's old → new; for a rule flag it's "Expected: …" → the current value.

---

## 3. Workflow engine source (a finding in its own right)

The engine primitives (`sp_engine_create_instance`, `sp_engine_insert_task`, `sp_engine_complete_instance_if_done`, `sp_resolve_first_supervisor`) and `com.sp_notify_user` had **no tracked source**:
- `documents/db-handoffs/2026-09-18_workflow_database_native_execution_type_procedures.sql` is referenced by other handoffs, but it isn't in this repo or its git history.
- The primitives existed only in live databases, and not in the local DB.

They were captured from prod with `pg_get_functiondef()` into `prisma/scripts/workflow_engine_primitives.sql`, which is now the local install source. **Raise this with the engine owners.**

---

## 4. Files

**New**
- `prisma/scripts/findings_review_workflow.sql`: the index change and the four procedures
- `prisma/scripts/workflow_engine_primitives.sql`: engine snapshot from prod (read-only reference)
- `scripts/create-finding-review-templates.py`: creates and publishes both templates **through the admin API** (the same validation as the UI); idempotent; local only
- `prisma/scripts/findings_review_templates.sql` (added 2026-09-25): the same templates as data, generated from the API-created rows; used by `scripts/seed.sql` and the production bundle. **Production deployment:** see `change-detection-production-deployment.md`.
- `src/services/findings/components/SyncFindingTasks.ts` (+ test)

**Modified**
- `prisma/scripts/fn_run_state_rules.sql`: acknowledged is live; `resolved_confirmed`
- `src/services/findings/`: live statuses, `resolve_confirmed`, task sync wired into both runs, and the new response fields
- `src/services/detection-rules/`: counts and retire include `acknowledged`; retiring closes tasks
- `client/src/pages/maintenance/findings/index.tsx`: badges for the new statuses; task counts and sync errors in the toasts
- `shared/dto/Finding.ts`, `scripts/seed.sql`: seed mirrors the index, the rules function and the four procedures (not the engine primitives, not the templates)

**Templates** (`FINDING_CHANGE_REVIEW`, `FINDING_RULE_REVIEW`; DATABASE; instantiate proc `sp_start_finding_review_workflow`; every outcome DATABASE / `sp_handle_finding_outcome` / triggers action):

| Template | Task | Starting | Outcomes |
|---|---|---|---|
| Change | `REVIEW_CHANGE` "Review Change" | yes | `AGREE` (terminal), `DISAGREE` |
| Change | `AWAIT_CHANGE_FIX` "Awaiting Fix" | no | `AGREE` "Agree (accept new value)" (terminal) |
| Rule | `REVIEW_RULE_FLAG` "Review Rule Flag" | yes | `MARK_RESOLVED` |
| Rule | `AWAIT_RULE_FIX` "Awaiting Confirmation" | no | `DISMISS` (terminal) |

---

## 5. Verification (local)

- **The brief's test plan, all 6 steps**, ran through the real HTTP endpoints (Run buttons, workflow inbox, task completion):
  - 5 drifted findings produced 5 tasks for usr 1 (before PM assignment existed), all in the inbox, with 5 notifications;
  - re-running created 0 tasks;
  - Agree advanced the baseline and completed the instance;
  - Disagree and Mark as Resolved left follow-up tasks active in the inbox;
  - a fix produced `resolved_confirmed` and closed the follow-up tasks on that run;
  - a never-acknowledged fix produced `self_resolved` and closed its task.

  Afterwards no live findings or active tasks were left, and the snapshot matched the approved state again.
- **Broken config** (rolled back): with the template unpublished, no task was created and the finding was untouched. When the engine raised midway, a warning was logged, the finding was untouched and **0 orphan instances** were left. With the config restored, the task was created.
- **Checks:** full vitest suite 47 passing; the server type-check has only the 48 pre-existing errors; the client type-check shows no errors in touched files.

- **PM assignment** (rolled back):
  - a stand-in PM with Kevin Fino Herrera's WDID received his projects' tasks and notifications, and kept the Mark as Resolved follow-up;
  - an unknown WDID, an ended team member and a non-project entity each fell back to usr 1 locally.

## 6. Open items

1. **DB team handoff order:** `workflow_engine_primitives.sql` (if absent) → `findings_review_workflow.sql` → `fn_run_state_rules.sql`. Then author the templates in the admin UI using the table above. Publish fails if the procs aren't there yet, which makes it a free deployment check.
2. **An engine primitive for system task completion**, to replace the direct task-row and WAL writes (§2.5).
3. **Task names are generic** ("Review Change") because they come from the template. Entity and field show in the drawer and the notification, not in the inbox row.
4. **Local history remains:** the E2E run's 5 resolved findings and their completed instances. The Findings screen's default "Open" filter shows none.

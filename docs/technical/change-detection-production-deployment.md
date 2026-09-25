# Change Detection — Production Deployment Runbook

Date 2026-09-25 · Branch `findings-review-workflow` · Bundle `prisma/scripts/production/2026-09-25_change_detection/`

---

## 1. What is being deployed

**Change-detection findings engine** (Run Findings) and **state rules engine** (Run Rules) with rule types `required_not_null`, `required_empty`, `range_check`, `boolean_equals`, and `required_when`. The Detection Rules screen to configure state rules. Object & Field Manager to define watched entities and fields. Findings Review Workflow: every finding gets a review task assigned to the project manager (fallback Milton Ayala usr_id 311), created and closed by the same two buttons (Run Findings and Run Rules).

See [findings-review-workflow.md](findings-review-workflow.md) for the workflow behavior and assignment logic. See [findings-run-rules-handoff.md](findings-run-rules-handoff.md) for the state rules engine details.

---

## 2. How production differs from local

- **Locally**, `scripts/setup-local-db.sh` rebuilds everything: `prisma db push` creates all tables, then `scripts/seed.sql` creates every function, the index, workflow templates, and screen permissions. A local rebuild is complete in one shot.

- **Production never runs** `seed.sql` or `prisma db push`. The production container (from `Dockerfile`) only builds the app. Per Governance/10, all DDL goes through the DB team. **Production = DB team runs the bundle scripts, then the app container is deployed as usual.**

- **Production starts blank** for change detection: no watched entities, fields, rules, baselines, snapshots, or findings. The seed no longer inserts any of these (removed 2026-09-25). The bundle inserts only: the two workflow templates (`FINDING_CHANGE_REVIEW`, `FINDING_RULE_REVIEW`) with their tasks and outcomes; the snapshot-upload template (Data Import); and Findings/WatchedFields screen permissions for the `admin` role.

- **Workflow engine primitives** (`ds.sp_engine_create_instance`, `ds.sp_engine_insert_task`, `ds.sp_engine_complete_instance_if_done`, `com.sp_notify_user`) already exist in production and are owned by the workflow engine team. The bundle never creates them — it checks for them with exact signatures and refuses to run if any are missing. `prisma/scripts/workflow_engine_primitives.sql` is a captured copy used only for local environments.

---

## 3. The bundle

| File | Who runs it | What it does | Writes? |
|---|---|---|---|
| `00_preflight_check.sql` | DB team / owner | Read-only report, one row per check. `blocking` rows must all have `ok = true`. | No |
| `01_deploy.sql` | DB team | One transaction. Guard first (PostgreSQL ≥ 15, every expected table/column, engine primitives with exact signatures). Then: unique index `uq_fnd_open_entity_field` on (entity type, entity, field, rule) for open/acknowledged findings, watched-field CHECK constraints, state rules engine function, review workflow procedures (including PM assignee resolver), workflow templates, snapshot-upload template, screen permissions for `admin` role. Idempotent — safe to re-run. **Contains DROP INDEX** (old `uq_fnd_open_fingerprint` and current `uq_fnd_open_entity_field`, recreated in same transaction). | Yes |
| `02_verify.sql` | DB team / owner | Read-only. Every row must show `ok = true`. Row "fallback reviewer resolves to 311" proves fallback email maps to usr_id 311 in production. | No |
| `03_pm_assignment_check.sql` | Owner | Read-only. After the first snapshot: who each project's tasks will go to and whether that person holds `Workflow` write permission. | No |
| `04_load_baseline_from_snapshot.sql` | Owner | Promotes the uploaded snapshot to the approved baseline. Never overwrites an existing baseline. | Yes |

---

## Before you start: what is needed

- **Someone on the DB team** to run `00`, `01` and `02` against production. Share the output of `00` before scheduling `01`.
- **Change-detection tables in production.** If `00` shows "missing table/column" rows, the DB team must create those from `prisma/schema.prisma` first. The bundle deliberately creates no tables.
- **A role for project managers** with `Workflow` read + create, granted to every PM before tasks start arriving (§6). `03_pm_assignment_check.sql` lists any PM who lacks it.
- **The first snapshot file** (TSV) and the list of fields to watch, ready for first-time setup (§5).

## 4. Deployment steps

**1. Run `00_preflight_check.sql` in production.**  
Done when: no `blocking` row has `ok = false`. If "missing table/column" rows appear, the DB team creates them from `prisma/schema.prisma` first (the bundle does not create tables). If an engine primitive row is false, stop and contact the workflow engine team.

**2. DB team runs `01_deploy.sql` (single transaction).**  
If the guard finds a missing dependency it raises an error before changing anything, and the whole transaction rolls back.

**3. Run `02_verify.sql`.**  
Done when: all rows show `ok = true`. Row "fallback reviewer resolves to 311" must be true (it proves the fallback email maps to usr_id 311).

**4. Deploy the app container (normal release process).**  
No environment variables or config changes are needed for this feature.

**5. Smoke check in the app.**  
Sign in as an admin. The Maintenance hub shows Findings, Detection Rules, and Object & Field Manager. Visit `/admin/workflow/templates` and confirm `FINDING_CHANGE_REVIEW` and `FINDING_RULE_REVIEW` are PUBLISHED.

---

## 5. First-time setup after deploy (the owner; order matters)

**1. Object & Field Manager** (`/maintenance/watched-fields`): create the watched entity `project`, then its watched fields. Field paths must match the snapshot JSON keys exactly. **Must come first:** the baseline table has a foreign key to the watched entity.

**2. Data Import** (`/data-import`): upload the first snapshot TSV using the "Entity Snapshot" template. Columns: `entity_type`, `entity_id`, `payload`. The `payload` is JSON and must be RFC-4180-quoted.

**3. Load the baseline:** edit `<your email>` in `04_load_baseline_from_snapshot.sql`, run it, check the two counts, COMMIT.

**4. Detection Rules** (`/maintenance/detection-rules`): create the state rules you want. None are pre-loaded.

**5. Run Findings and Run Rules** once on the Findings screen (`/maintenance/findings`). With snapshot == baseline and no violations, expect 0 findings and 0 tasks.

**6. Run `03_pm_assignment_check.sql`** to confirm who tasks will go to.

**Then "Ongoing":** upload each new snapshot via Data Import (the template truncates before import, so each upload replaces the previous), then click Run Findings and Run Rules. Findings, task creation, and task closing all happen in those two clicks. Agree on a change advances the baseline for that field; the baseline otherwise only changes via script 04 for brand-new entities.

---

## 6. Permissions — who needs what

**Model:** people get roles at `/security/user-roles`; roles get permissions per resource at `/security/permissions` (resources listed at `/security/options`). Actions: `read` = view, `create` = create/update/run (the app uses `create` for writes), `delete`.

| Who | Resource | Needs | Why |
|---|---|---|---|
| Change-detection admins (you) | `Findings` | read + create | View Findings, Run Findings/Run Rules, Detection Rules screen |
| Change-detection admins | `WatchedFields` | read + create | Object & Field Manager |
| Project managers | `Workflow` | read + create | See review tasks in `/my-tasks?tab=workflow` and complete them (Agree/Disagree/Mark as Resolved/Dismiss). Without write, they see tasks they cannot act on. |
| Project managers | `Findings` | not required | They work entirely from the task inbox. |
| Anyone who edits templates | `WorkflowAdmin` | read + create | Edit templates at `/admin/workflow/templates` |

**The bundle grants** `Findings` and `WatchedFields` to the `admin` role only. **For anyone else:** (1) pick or create a role at `/security/roles`; (2) in `/security/permissions` tick read/create for the resource; (3) at `/security/user-roles` give the person that role. Recommend a dedicated role like "Project Manager (Findings Review)" holding only `Workflow` read+create.

**Note:** permission changes apply at the person's next login/token refresh (they may need to sign out and back in).

Task inbox and completion are keyed on the person's app user (`ds.tbl_users.usr_id`), which the assignment resolver uses, so no extra mapping is needed.

---

## 7. Who gets each review task

The project's `project_manager` value's trailing "(WDID)" — e.g. "(10017904)" — is extracted. That WDID is matched to an ACTIVE team member (`ds.tbl_team_members.wdid`; active = start date ≤ today and end date empty or ≥ today) and their app user is used. Otherwise the task falls back to Milton Ayala (looked up by email `milton.ayala2@telusinternational.com`; usr_id 311 in production; 311 is also the hard-coded last resort).

The task is assigned when created; follow-up tasks stay with the same person.

See [findings-review-workflow.md](findings-review-workflow.md#1a-who-gets-the-task-added-2026-09-25) §1a for details.

---

## 8. Rollback

- **The deploy is one transaction:** if it fails, nothing changed.

- **After a successful deploy,** the feature is inert until you configure watched fields/rules and upload snapshots. The simplest rollback is to not use it. To disable task creation only: set the two templates to ARCHIVED in `/admin/workflow/templates`. Runs still produce findings; no tasks are created.

- **Full removal** would be DB-team work (drop the six functions, restore the previous index) — not scripted. Ask the DB team before doing it.

---

## 9. Known limitations / notes

- The seed's corporate phone lines insert (`scripts/seed.sql` ~line 640) fails locally on a missing column `usr_id_created_by`; pre-existing since the initial import, unrelated to this feature, local only.

- `setup-local-db.sh` runs the seed with `|| true`, so local seed errors are silent — check its output.

- No engine primitive exists for system task completion. `fn_close_resolved_finding_tasks` writes the task row and WAL entry the way `TaskCompletionOrchestrator` does. A proper engine primitive would be the clean fix (see [findings-review-workflow.md](findings-review-workflow.md#2-where-the-build-differs-from-the-brief-and-why) §2).

- Agree on a change is audited as the baseline change only (engine limitation: one audit row per outcome).

---

## 10. Verified before handoff (2026-09-25)

- In a throwaway copy of the schema simulating production (engine primitives present, feature absent): pre-flight all blocking rows ok; deploy ran clean 3 times (idempotent); verify all ok (except the 311 check, which needs production users); guard refused to deploy with an engine primitive missing and left the database untouched.

- Smoke test (entity + field + `required_when` rule + baseline + drifted snapshot) produced a finding and a review task assigned through the resolver (to the fallback, since the test PM had no team member). PM assignment itself was verified separately against a stand-in team member with a real WDID.

- A fresh local rebuild (schema + `seed.sql`, run twice) produced all functions, both templates published, and zero change-detection data.


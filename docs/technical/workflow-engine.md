# Technical Documentation: Workflow Engine

**Domain:** Generic multi-step process orchestration (`ds` schema, `wfl`/`wtk`/`win`/`wit`/... table families)
**Feature area:** Template Builder + Instance Execution + Task Inbox
**Frontend pages:** `/admin/workflow/templates`, `/admin/workflow/templates/:wflId/edit`, `/admin/workflow/instances`, `/admin/workflow/instances/:winId`, `/my-tasks`, `/workflow/instances/:winId`
**Backend routes:** `/api/workflow/templates`, `/api/workflow/instances`, `/api/workflow` (tasks + admin overrides)
**Services:** `src/services/workflow/`

---

## Glossary

**Workflow Template**
A reusable, versioned definition of a multi-step business process — e.g. "New Hire Onboarding." Authored once in Draft status, then published. Stored in `ds.wfl_workflow_templates`. A template cannot be edited once published; changes require a new version (a new template row with an incremented `versionNo`).

**Workflow Instance**
A single live run of a published template, created every time the process actually happens for a real case (e.g. this specific new hire). Stored in `ds.win_workflow_instances`. An instance is a full copy of the template's tasks, dependencies, and notifications at the moment it was started — later edits to the template do not retroactively affect instances already running.

**Template Task / Instance Task**
A template task (`ds.wtk_workflow_template_tasks`) is one step definition in a template (who does it, how long they have, what happens if they don't). An instance task (`ds.wit_workflow_instance_tasks`) is the live, stateful copy of that step for one specific instance — it tracks who it's assigned to, when it was activated, started, and completed.

**Outcome**
A named result a task can be completed with (e.g. `APPROVED`, `REJECTED`, `DONE`). Defined per template task in `ds.wto_workflow_template_task_outcomes`. `isTerminal` marks whether that outcome represents the task succeeding (`true`) or failing (`false`) — this drives the instance task's resulting `state` (`SUCCESS` vs `FAILED`).

**Route**
A directed edge from one template task to another, optionally gated by an outcome. Defined in `ds.wtr_workflow_template_routes`. Used to build branching flows: "if task 3 outcome is REJECTED, go to task 7; otherwise go to task 4."

**Dependency**
A predecessor/successor relationship between two template tasks, defined in `ds.wtd_workflow_template_dependencies` (and copied to `ds.wid_workflow_instance_task_dependencies` per instance). Two types: `FINISH_TO_START` (informational ordering) and `PARALLEL_JOIN` (the successor cannot activate until every required predecessor sharing the same `joinGroupCode` has reached a terminal state — `SUCCESS`, `FAILED`, or `OVERRIDDEN`).

**Notification**
A rule attached to a template task describing who gets told what, and when. Defined in `ds.wtn_workflow_template_notifications`, copied per-instance into `ds.wnt_workflow_instance_notifications`. Distinct from an actual sent email or in-app alert — see [§9](#9-notifications) for the current dispatch gap.

**Instance Context**
A key/value data bag scoped to a running instance (`ds.wic_workflow_instance_context`), used to carry data between tasks or seed values from the triggering entity (e.g. the new hire's name, pulled from the Hiring record that started the instance).

**Business Reference**
The link between a workflow instance and the real-world record it exists for. Stored as a loose pair of strings on the instance: `businessReferenceType` (e.g. `'TimeOff'`, `'Hiring'`) and `businessReferenceId` (e.g. the row's primary key, as a string). Not a DB foreign key — deliberately generic so one engine can back any domain. A domain can additionally register a resolver that turns this pair into a human-readable summary and a link to the record's own detail page — see [§10](#10-entity-links-task-inbox--detail).

**Assignment Type**
How a task decides who is responsible for it: `USER` (a specific person, by `wtk_assigned_user_id`), `ROLE` (any member of a role, first to claim it), `DYNAMIC` (resolved at runtime — see next entry), `DYNAMIC_TD_HIERARCHY` (an org-position lookup — see next entry), or `CONTEXT` (no resolution algorithm at all — the assignee is supplied directly by the caller, e.g. Admin Jump's `assigneeUserId`; mandatory on every task of a `DATABASE`-execution-type template, forbidden on `CODE`-type templates — see **Execution Type** below and [§11a](#11a-domain-side-effects--database-execution-type)).

**Execution Type**
Configured per template (`wfl_execution_type`) and per outcome (`wto_execution_type`): `CODE` (the default — instantiation and outcome side effects run as TypeScript, per [§11](#11-domain-side-effects-outcome-handlers)) or `DATABASE` (that side effect runs as a PostgreSQL stored procedure instead, configured via `wfl_instantiate_proc_name`/`wto_outcome_proc_name` — no code deploy needed to add or change one). Decided **per outcome**, not per template — a `CODE`-type template may mix in individual `DATABASE`-type outcomes. See [§11a](#11a-domain-side-effects--database-execution-type).

**Dynamic Assignment Type**
The resolution strategy used when `assignmentType = 'DYNAMIC'`. Two values exist today: `MANAGER` and `FIRST_SUPERVISOR` — both currently resolve identically, via `resolveTaskResponsible` walking up from the instance's `ownerUserId` to that person's own direct supervisor, using the shared `resolveFirstSupervisorUserId` helper (backed by `getFirstSupervisorForWorkflow`, the depth-1 upward counterpart to the downward-walking `getReports`).

**`DYNAMIC_TD_HIERARCHY` (Assignment Type)**
A separate assignment type from `DYNAMIC` above, not one of its dynamic-assignment-type values. Resolves an org position (`TEAM_LEADER`, `OM`, or `AGM`, via `dynamicAssignmentType`) sitting above the *business record's own subject* — via `ds.hbt_hierarchy_by_teammember` and `getOrgPositionForWorkflow` — rather than above the instance's `ownerUserId`. The subject is looked up through a per-domain resolver registered in `BusinessReferenceSubjectRegistry`, since the person an instance is *about* (e.g. the employee a time-off request belongs to) isn't always the same person who started it (e.g. a supervisor filing on their behalf) — see the "Owner is the acting requester" note in [§5](#5-task-assignment-model).

**Resolved User**
The actual `usr_id` an instance task is assigned to once assignment logic has run (`wit_resolved_user_id`). `null` for `ROLE`-assigned tasks until someone claims them.

**SLA / Due Date / Escalation**
`slaDurationHours` on a task defines how long its assignee has once it activates. `dueAt` is stamped as `activatedAt + slaDurationHours`. If a task is still `ACTIVE` past its `dueAt`, the [SLA Breach Scanner](#8-sla-due-dates--escalation) escalates it to the configured escalation user/role/dynamic recipient.

**Task Reassignment**
Moving an active task's responsibility to a different user or role mid-flight, logged in `ds.wre_workflow_task_reassignments`. Gated by the task's `allowReassignment` flag; `requireCommentOnReassign` controls whether a reason is mandatory.

**Admin Override**
One of three privileged actions on a running instance, gated by the `WorkflowAdmin` permission and always requiring a `reason`: **Jump** (force-void the current active task(s) and directly activate a chosen target task), **Force Complete** (override every remaining active/pending task and mark the instance `COMPLETED`), **Destroy** (void every remaining active/pending task and mark the instance `DESTROYED`).

**Workflow Audit Log (`wal`)**
A dedicated, workflow-specific event trail (`ds.wal_workflow_audit_log`) recording engine-internal events (`INSTANCE_STARTED`, `TASK_ACTIVATED`, `ROUTE_SELECTED`, `TASK_ESCALATED`, `NO_RESPONSIBLE_FOUND`, `INSTANCE_COMPLETED`, `INSTANCE_FAILED`, etc.). This is separate from — and in addition to — the application-wide `auditOrchestrator.log(...)` call made for each mutating action, per [Governance/05_AUDIT_LOGGING_RULES.md](../../Governance/05_AUDIT_LOGGING_RULES.md).

---

## 1. Purpose and Design Intent

The Workflow Engine solves the recurring problem of coordinating a multi-step, multi-owner business process without hand-coding a bespoke state machine for each one. Instead of writing custom code every time a new "approve → do X → notify → escalate if late" flow is needed, a process is authored **once** as a Workflow Template — a sequence of tasks with assignment rules, SLAs, branching, and notifications — and then **instantiated** any number of times against real records.

The engine is intentionally domain-agnostic: it has no knowledge of Time Off, Hiring, or any other feature. It links to the real world purely through the generic `businessReferenceType`/`businessReferenceId` pair and an optional `WecWorkflowEntityConfig` mapping that seeds instance context from the source entity's fields. This means the same engine backs any number of unrelated business processes, and adding a new one is (in the common case) a matter of authoring template data through the admin UI — not writing new backend code.

---

## 2. Database Schema

All 18 tables live in the `ds` PostgreSQL schema, split into a **template layer** (the reusable definition) and an **execution layer** (one live record set per actual run).

### 2.1 Template layer

```
ds.wec_workflow_entity_configs        — declares an entity type a template can bind to (e.g. "TimeOff")
ds.wef_workflow_entity_fields         — which of that entity's fields seed instance context on start

ds.wfl_workflow_templates             — the template: code, name, versionNo, status (DRAFT|PUBLISHED|ARCHIVED),
                                         executionType (CODE|DATABASE), instantiateProcName
  └─ ds.wtk_workflow_template_tasks       — each task: assignment, SLA, escalation, retry rules
       ├─ ds.wti_workflow_template_task_inputs      — input fields the task collects on completion
       ├─ ds.wto_workflow_template_task_outcomes    — possible outcomes (isTerminal, triggersOutcomeAction,
       │                                              executionType, outcomeProcName)
       └─ ds.wtn_workflow_template_notifications    — notification rules attached to the task
  ├─ ds.wtr_workflow_template_routes       — outcome-gated edges: task A + outcome → task B
  └─ ds.wtd_workflow_template_dependencies — predecessor/successor edges (FINISH_TO_START | PARALLEL_JOIN)
```

### 2.2 Execution layer

```
ds.win_workflow_instances             — one live run; links to the real record via businessReferenceType/Id
  ├─ ds.wit_workflow_instance_tasks       — live copy of each task: state, activatedAt/startedAt/completedAt/dueAt
  │    ├─ ds.wii_workflow_instance_task_inputs         — live copy of expected inputs
  │    ├─ ds.wiv_workflow_instance_task_input_values   — values actually entered on completion
  │    ├─ ds.wnt_workflow_instance_notifications        — live copy of notification rules + lastTriggeredAt
  │    └─ ds.wre_workflow_task_reassignments            — reassignment history
  ├─ ds.wid_workflow_instance_task_dependencies      — live copy of dependencies for this instance
  ├─ ds.wic_workflow_instance_context                — key/value data bag, shared across tasks
  └─ ds.wal_workflow_audit_log                       — dedicated workflow event trail
```

For the exact column list of every table, see the `Wec`/`Wef`/`Wfl`/`Wtk`/`Wti`/`Wto`/`Wtr`/`Wtd`/`Wtn`/`Win`/`Wit`/`Wii`/`Wiv`/`Wid`/`Wnt`/`Wic`/`Wre`/`Wal` models in [`prisma/schema.prisma`](../../prisma/schema.prisma).

---

## 3. State Machines

### 3.1 Instance task state (`wit_state`)

```
PENDING ──(starting task, or predecessor completes + join satisfied)──▶ ACTIVE
ACTIVE ──(complete, outcome.isTerminal = true)──▶ SUCCESS
ACTIVE ──(complete, outcome.isTerminal = false, or unknown outcome code)──▶ FAILED
FAILED ──(retry, if retryCount < maxRetryCount)──▶ ACTIVE
ACTIVE/PENDING ──(admin Jump on the *other* branch tasks)──▶ OVERRIDDEN
ACTIVE/PENDING ──(admin Force Complete)──▶ OVERRIDDEN
ACTIVE/PENDING ──(admin Destroy)──▶ VOIDED
```

`SUCCESS`, `FAILED`, and `OVERRIDDEN` all count as "terminal" for the purpose of parallel-join evaluation ([§7](#7-dependencies--parallel-joins)).

### 3.2 Instance status (`win_status`)

```
ACTIVE ──(no ACTIVE/PENDING tasks remain, last task terminal & no route found)──▶ COMPLETED
ACTIVE ──(no ACTIVE/PENDING tasks remain, last task FAILED with retries exhausted & no route found)──▶ FAILED
ACTIVE ──(admin Force Complete)──▶ COMPLETED
ACTIVE ──(admin Destroy)──▶ DESTROYED
```

Completion is **never** an explicit "this is the final task" flag — it is derived every time a task completes, by counting remaining `ACTIVE`/`PENDING` tasks on the instance ([`TaskCompletionOrchestrator.ts:331-380`](../../src/services/workflow/TaskCompletionOrchestrator.ts)). A task is "final" simply because no route or dependency leads anywhere from it.

---

## 4. Architecture — Orchestrators and Components

Per [Governance/02_BACKEND_ARCHITECTURE.md](../../Governance/02_BACKEND_ARCHITECTURE.md), the domain lives entirely under `src/services/workflow/`, split into orchestrators (entry points) and single-purpose components.

**Orchestrators:**
- `WorkflowTemplateOrchestrator.ts` — template CRUD, plus adding/removing tasks, inputs, outcomes, routes, dependencies, and notifications; publish/archive lifecycle.
- `WorkflowInstantiationOrchestrator.ts` — the single entry point that turns a published template into a running instance (see [§13](#13-instantiation-flow)).
- `TaskCompletionOrchestrator.ts` — completes a task: validates inputs, persists input values, determines the resulting state from the outcome, runs routing, evaluates joins for downstream tasks, activates and resolves responsibility for any task that becomes eligible this way (the same resolution step instantiation performs for starting tasks — see [§5](#5-task-assignment-model)), and checks whether the instance as a whole is now complete. For a `DATABASE`-execution-type outcome, calls its configured stored procedure instead of the [§11](#11-domain-side-effects-outcome-handlers) registry, and skips the routing/activation/completion steps the procedure already performed itself — see [§11a](#11a-domain-side-effects--database-execution-type).

**Components** (`src/services/workflow/components/`):

| File | Responsibility |
|---|---|
| `CalculateDueDate.ts` | `activatedAt + slaDurationHours` → `dueAt`, or `null` if no SLA set |
| `ResolveEntityContext.ts` | Reads the source entity's fields (per `WecWorkflowEntityConfig`/`WefWorkflowEntityField`) into instance context at start |
| `ResolveTaskResponsible.ts` | Resolves `USER`/`ROLE`/`DYNAMIC` assignment into a `resolvedUserId` |
| `ResolveFirstSupervisorUserId.ts` | Resolves a workflow owner's `usr_id` to their own direct supervisor's `usr_id` (owner → teamMemberId → supervisor teamMemberId → supervisor `usr_id`), backed by `getFirstSupervisorForWorkflow` in `src/services/teamMember/queries/`. Shared by `ResolveTaskResponsible.ts`'s `DYNAMIC` case and `EscalateTask.ts`'s dynamic escalation case — both used to have their own, independently-broken downward-walking lookup here; this is now the single upward-walking source of truth for both. |
| `RoutingEngine.ts` | Picks the first matching outgoing route (`NONE` or `OUTCOME_ONLY`, ordered by `routeOrder`) after a task completes |
| `JoinConditionEvaluator.ts` | Decides whether a candidate task may activate, honoring `PARALLEL_JOIN` dependencies grouped by `joinGroupCode` |
| `ValidateTaskInputs.ts` | Validates submitted input values against the task's input definitions before completion is allowed |
| `ClaimTask.ts` | Claim / unclaim a `ROLE`-assigned task |
| `ReassignTask.ts` | Reassign an active task to a different user/role, writing `WreWorkflowTaskReassignment` |
| `EscalateTask.ts` | Marks a task escalated, resolves the escalation recipient, fires `notifyWorkflowEvent(ON_ESCALATION)` |
| `RetryTaskHandler.ts` | Re-activates a `FAILED` task if `retryCount < maxRetryCount` |
| `SlaBreachScanner.ts` | Scheduled sweep — see [§8](#8-sla-due-dates--escalation) |
| `NotificationDispatcher.ts` | Looks up notification rules for an event and (today) only logs them — see [§9](#9-notifications) |
| `AdminForceComplete.ts` / `AdminTaskJump.ts` / `AdminDestroyWorkflow.ts` | The three admin overrides ([§14](#14-admin-overrides)) |
| `GetTaskInbox.ts` | Backing query for `/api/workflow/inbox`; also resolves each task's entity link — see [§10](#10-entity-links-task-inbox--detail) |
| `BusinessReferenceLinkRegistry.ts` | Domain-registered resolvers (keyed by `businessReferenceType`) that turn a `businessReferenceId` into a display `{ url, summary }` pair — see [§10](#10-entity-links-task-inbox--detail) |
| `WorkflowOutcomeRegistry.ts` | Domain-registered handlers (keyed by `businessReferenceType`) invoked when a completed task's chosen outcome has `triggersOutcomeAction = true` — see [§11](#11-domain-side-effects-outcome-handlers) |
| `GetWorkflowAuditLog.ts` | Backing query for the per-instance audit log view |
| `ValidateRoutingExpressions.ts`, `ValidateTaskDependencies.ts`, `ValidateTaskRoutes.ts`, `ValidateTemplateCode.ts`, `BuildTemplateSnapshot.ts`, `ValidateExecutionType.ts` | Template-authoring/publish-time validation — `ValidateExecutionType.ts` enforces the `DATABASE`-execution-type rules, see [§11a](#11a-domain-side-effects--database-execution-type) |
| `InvokeDatabaseOutcomeProcedure.ts` | Guarded call into a `DATABASE`-type outcome's configured stored procedure — see [§11a](#11a-domain-side-effects--database-execution-type) |
| `PendingNotificationScanner.ts` | Scheduled sweep dispatching `ON_ASSIGNMENT` notifications for tasks activated with no TypeScript in the call chain — see [§9](#9-notifications) and [§11a](#11a-domain-side-effects--database-execution-type) |

---

## 5. Task Assignment Model

`assignmentType` on a template/instance task is one of:

| Value | Behavior |
|---|---|
| `USER` | `resolvedUserId = assignedUserId` directly. |
| `ROLE` | `resolvedUserId` stays `null`; any member of `assignedRoleId` can claim it via `POST .../claim`. |
| `DYNAMIC` | Resolved at activation time by `resolveTaskResponsible`, using `dynamicAssignmentType`: `MANAGER` or `FIRST_SUPERVISOR` — both currently resolve identically, walking from the instance's `ownerUserId` up to that person's own direct supervisor via `resolveFirstSupervisorUserId`. If no supervisor is found, the task activates with `resolvedUserId = null` and a `NO_RESPONSIBLE_FOUND` entry is written to the workflow audit log — the task is not blocked, just unassigned until claimed or reassigned. |
| `DYNAMIC_TD_HIERARCHY` | Resolved at activation time by `resolveTaskResponsible`, using `dynamicAssignmentType`: `TEAM_LEADER`, `OM`, or `AGM`. Looks up the org position *above the business record's own subject* (via the domain's `BusinessReferenceSubjectRegistry` resolver, then `ds.hbt_hierarchy_by_teammember`/`getOrgPositionForWorkflow`) — not above the instance's `ownerUserId`, since the requester and the record's subject can differ. If the subject or position can't be resolved, the task activates with `resolvedUserId = null` and a `NO_RESPONSIBLE_FOUND` entry is written, same as `DYNAMIC`. |
| `CONTEXT` | No resolution algorithm — `resolveTaskResponsible` is never called for it. The assignee must be supplied directly by the caller. Mandatory on every task of a `DATABASE`-execution-type template (enforced at publish time by `ValidateExecutionType.ts`), forbidden on `CODE`-type templates. The only way to set it from TypeScript today is Admin Jump's `assigneeUserId` ([§14](#14-admin-overrides)); a `DATABASE`-type template's own instantiate/outcome procedure sets `wit_resolved_user_id` directly via SQL. See [§11a](#11a-domain-side-effects--database-execution-type). |

Escalation uses the identical three-way shape (`escalationUserId` / `escalationRoleId` / `escalationDynamicType`); the `DYNAMIC` case in `EscalateTask.ts` resolves through the same `resolveFirstSupervisorUserId` helper as task assignment, rather than a separate implementation.

**Resolution runs at every point a task transitions into `ACTIVE`** — not only when it's a starting task at instantiation ([§13](#13-instantiation-flow)), but also when it activates mid-flow via routing or a join ([§6](#6-routing--branching)), and when it becomes an admin Jump target ([§14](#14-admin-overrides)). All three call `resolveTaskResponsible` the same way, so a `DYNAMIC` or `USER` task is never left with a stale or unresolved `resolvedUserId` just because it wasn't the instance's first task.

**Owner is the acting requester, not necessarily the task's subject.** `ownerUserId` is set once at instantiation and is deliberately whoever *initiated* the instance, which is not always the same person the underlying record is about. For example, when a supervisor files a time-off exception on a direct report's behalf, `ownerUserId` is set to the supervisor (not the report), specifically so `DYNAMIC`/`FIRST_SUPERVISOR` escalates one level further up rather than resolving back to the supervisor who already made the call by submitting it (see `supervisor.routes.ts`'s call into `startExceptionAuthorization`). Anyone adding a new domain integration should decide deliberately which usr_id to pass as `ownerUserId` — it is not automatically "the employee this instance is about."

---

## 6. Routing & Branching

`RoutingEngine.ts` runs once a task completes. It loads every `WtrWorkflowTemplateRoute` whose `wtkFromId` matches the completed template task, ordered by `routeOrder`, and picks the **first** one that matches:

- `conditionType: 'NONE'` — matches unconditionally (used for a single, non-branching next step).
- `conditionType: 'OUTCOME_ONLY'` — matches only if the route's linked outcome (`wtoId`) has the same `code` as the outcome the task was just completed with.

If no route matches, `routeFound: false` is returned — this is one of the two conditions the instance-completion check uses to decide `COMPLETED` vs `FAILED` ([§3.2](#32-instance-status-win_status)).

Once a route's target task is chosen, `JoinConditionEvaluator.ts` decides whether it may actually activate ([§7](#7-dependencies--parallel-joins)); if it does, `TaskCompletionOrchestrator.ts` resolves its responsible party exactly as described in [§5](#5-task-assignment-model) — assignment is evaluated fresh for each newly-activated task, never inherited from whichever task completed just before it.

---

## 7. Dependencies & Parallel Joins

Two `dependencyType` values exist:

- **`FINISH_TO_START`** — purely informational ordering; `JoinConditionEvaluator.ts` does not gate on it.
- **`PARALLEL_JOIN`** — the successor task cannot activate until every `isRequired: true` predecessor sharing its `joinGroupCode` has reached a terminal state (`SUCCESS`, `FAILED`, or `OVERRIDDEN`). This is how the engine expresses "wait for all of tasks 4, 5, and 6 before starting task 7," even when 4/5/6 run in parallel and finish in any order.

A task with no dependency rows at all always activates immediately when reached (`shouldActivate: true`).

---

## 8. SLA, Due Dates & Escalation

`CalculateDueDate.ts` stamps `dueAt = activatedAt + slaDurationHours` the moment a task activates (whether at instance start, via routing, or via join evaluation).

`processSlaBreaches()` ([`SlaBreachScanner.ts`](../../src/services/workflow/components/SlaBreachScanner.ts)) is called once at startup and then on a `setInterval(processSlaBreaches, 15 * 60 * 1000)` loop registered in [`src/index.ts`](../../src/index.ts) — there is no cron library in this codebase; this "call once + `setInterval`" shape is the established convention (shared with `processAttritionTimeOffs` and `processCountdownNotifications`, both on a 24-hour interval).

Each sweep:
1. Queries `wit_workflow_instance_tasks` where `state = 'ACTIVE'`, `dueAt < now`, `escalatedAt: null`.
2. For each, calls `escalateTask(tx, witId)`, which is idempotent (`escalatedAt !== null` short-circuits), stamps `escalatedAt`, resolves the escalation recipient (`escalationUserId`/`escalationRoleId`/`escalationDynamicType`, the `DYNAMIC` case via `resolveFirstSupervisorUserId` — see [§5](#5-task-assignment-model)), calls `notifyWorkflowEvent({ eventType: 'ON_ESCALATION', ... })`, and writes a `TASK_ESCALATED` entry to the workflow audit log.
3. Writes an application-level `auditOrchestrator.log(...)` entry per escalated task.

Escalation does **not** reassign the task or change its state — it only notifies (subject to [§9](#9-notifications)'s current gap) and marks it escalated so the scanner doesn't re-fire on it.

---

## 9. Notifications

Notification rules are authored per template task (`WtnWorkflowTemplateNotification`) and copied verbatim into the instance (`WntWorkflowInstanceNotification`) at instantiation, so editing a template never changes notification behavior for instances already running.

**Event types:** `ON_ASSIGNMENT`, `ON_REASSIGNMENT`, `ON_REMINDER`, `ON_ESCALATION`.
**Recipient types:** `USER` (a specific `recipientUserId`), `ROLE` (`recipientRoleId`), `DYNAMIC` (`recipientDynamicType`, resolved the same way as task assignment).
Each rule carries a `messageTemplate` (in-app text) and an optional `emailTemplate`.

### ⚠️ Known gap — no outbound dispatch

`NotificationDispatcher.ts` (`notifyWorkflowEvent`) currently does **not send anything**. It loads matching `WntWorkflowInstanceNotification` rows for the given `witId`/`eventType`, `console.warn`s the message/recipients, and stamps `lastTriggeredAt`. The file has an explicit TODO:

```ts
// TODO: This dispatcher currently only logs a warning because there is no outbound
// email/push mechanism available at this layer. When an outbound notification service
// is introduced, replace this with a proper dispatch call.
```

Two working outbound mechanisms already exist elsewhere in the codebase and are the natural fix, but neither is wired to the workflow engine today:
- `emailOrchestrator.send(...)` (`src/services/email/EmailOrchestrator.ts`) — AWS SES wrapper.
- `notificationOrchestrator.create(...)` (`src/services/notifications/NotificationOrchestrator.ts`) — in-app bell notifications, which itself can fire an email as a side effect when an `emailSubject` is supplied.

Until this is fixed, configuring a notification on a task (including the "on-escalation" reminder pattern) records the intent correctly but produces no visible alert to any user — only a server log line.

---

## 10. Entity Links (Task Inbox / Detail)

Task inbox rows and the task detail drawer are more useful when they show what a task is actually *about*, not just the workflow instance's generic name — e.g. "Jane Doe — Vacation, 12-Sep-2026 to 15-Sep-2026" instead of "Time-off exception authorization — request #123." Since the engine itself has no knowledge of what a `TimeOff` (or any other) record looks like, this is implemented as a second domain-registration seam, structurally identical to the outcome-handler pattern (`registerOutcomeHandler` / `WorkflowOutcomeRegistry.ts`) — see [§11](#11-domain-side-effects-outcome-handlers).

**`BusinessReferenceLinkRegistry.ts`** (`src/services/workflow/components/`) holds a `Map<businessReferenceType, resolver>`:

```ts
export type BusinessReferenceLinkResolver = (
  businessReferenceId: string,
) => Promise<{ url: string; summary: string } | null>;

registerBusinessReferenceLink(businessReferenceType: string, resolver: BusinessReferenceLinkResolver): void
getBusinessReferenceLinkResolver(businessReferenceType: string): BusinessReferenceLinkResolver | undefined
```

A domain registers its resolver once at startup (in `src/index.ts`, alongside its `registerOutcomeHandler` call if it has one). The only resolver registered today is `TimeOff` → `getTimeOffTaskSummary` (`src/services/timeoff/components/`), which fetches the live `TimeOff` row (joined to `teamMember`/`category`) and returns a summary string plus a link to `/timeoff-detail/:timeOffId`.

**Consumers** — both look up the instance's `businessReferenceType`/`businessReferenceId`, call the registered resolver if one exists, and attach the result as two new nullable fields, `entityUrl` and `entitySummary`:
- `GetTaskInbox.ts` (`GET /api/workflow/inbox`) — resolved once per task in the inbox list.
- The single-task detail handler (`GET /instances/:winId/tasks/:witId` in `src/services/workflow/routes/tasks.ts`) — resolved for the one task being viewed.

**Degrades gracefully.** An instance with no `businessReferenceType` at all (a purely manual/ad-hoc workflow), or a `businessReferenceType` with no registered resolver, simply yields `entityUrl: null, entitySummary: null`. Both frontend consumers (`WorkflowTasksTab.tsx`'s inbox table and `TaskExecutionDrawer.tsx`'s detail panel) fall back to rendering the instance's plain `winName` with no link in that case — nothing breaks for a domain that hasn't adopted this pattern yet.

Each resolver call is a live read against the domain's own tables, not a cached snapshot from instantiation time, so the summary always reflects the record's current state (e.g. a status change after the instance started is reflected immediately).

**Known accepted tradeoff:** resolution happens once per task per request (an N+1 read against the domain's table for however many tasks are in the inbox). Inbox sizes are small enough in practice that this hasn't needed batching.

---

## 11. Domain Side Effects (Outcome Handlers)

A workflow instance can carry more than a task inbox forward — completing a task can also need to change something in the domain it's about, e.g. flipping a `TimeOff`'s status when an exception request is approved or rejected. The engine itself has no knowledge of `TimeOff` or any other domain, so this is a third domain-registration seam (alongside entity links, [§10](#10-entity-links-task-inbox--detail), and notifications, [§9](#9-notifications)).

**`WorkflowOutcomeRegistry.ts`** (`src/services/workflow/components/`) holds a `Map<businessReferenceType, handler>`:

```ts
export interface OutcomeHandlerContext {
  tx: Prisma.TransactionClient;
  winId: string;
  witId: string;
  taskCode: string;
  outcomeCode: string;
  businessReferenceId: string;
  performedBy: string;       // req.user.email
  performedByUserId: string; // req.user.dsUserId, as a string
}

export type OutcomeHandler = (
  ctx: OutcomeHandlerContext,
) => Promise<(() => Promise<void>) | undefined>;

registerOutcomeHandler(businessReferenceType: string, handler: OutcomeHandler): void
getOutcomeHandler(businessReferenceType: string): OutcomeHandler | undefined
```

A domain registers its handler once at startup (in `src/index.ts`, alongside its `registerBusinessReferenceLink` call if it has one). The only handler registered today is `TimeOff` → `handleExceptionAuthorizationOutcome` (`src/services/timeoff/components/HandleExceptionAuthorizationOutcome.ts`).

**When it runs — gated by an explicit per-outcome flag, not a task name.** `TaskCompletionOrchestrator.ts` Step 6b looks up the instance's `businessReferenceType`, resolves a handler via the registry, and only invokes it when the *specific outcome the task was just completed with* has `wto_triggers_outcome_action = true` (`WtoWorkflowTemplateTaskOutcome.triggersOutcomeAction`). This flag is set by the template admin per outcome, in the outcome builder's Outcome Details panel — it is template configuration, not application code. It replaces an earlier design where the handler itself hardcoded a task-code check; that made "does this outcome trigger a domain effect" invisible to whoever was building the template and impossible to see without reading the handler's source. `handleExceptionAuthorizationOutcome` no longer performs any task-code check at all — by the time it's called, the orchestrator has already decided this specific outcome is meant to trigger it.

**Runs inside the same transaction as the task completion.** The handler receives `ctx.tx` — the live `Prisma.TransactionClient` for the task-completion transaction — so its domain mutation (e.g. `ctx.tx.timeOff.update(...)`) is atomic with the task being marked complete: if the handler throws, the whole task completion rolls back rather than leaving a task marked done while the domain record is left in a stale state. A handler may optionally return a callback, run *after* the transaction commits, for work that must not run inside it (writing a changelog/audit entry via the global Prisma client, for example).

**Which record gets mutated is independent of which task/template triggered it.** `ctx.businessReferenceId` is a loose string, not a DB foreign key — identical in kind to the `businessReferenceId` documented in [§10](#10-entity-links-task-inbox--detail) — set once at instantiation and pointing at one specific row regardless of which workflow instance or template produced the trigger. A second `TimeOff`-linked template flagging one of its own outcomes to trigger this same handler is not a name collision to guard against; it's the deliberate, per-outcome-row admin configuration this flag exists to allow.

**The remaining coupling point: `outcomeCode` interpretation.** The registry and the flag only decide *whether* a handler runs — the handler itself still has to know what the outcome *means*. `handleExceptionAuthorizationOutcome` recognizes exactly two literal outcome codes (`APPROVED`, `REJECTED`, from `ExceptionAuthorizationConstants.ts`) and maps them to a target `TimeOff.statusId`. An outcome flagged `triggersOutcomeAction = true` with any other code safely falls through to a no-op (`// Unrecognized outcome code for this task — nothing to do.`) rather than erroring — so a misconfigured outcome degrades gracefully instead of corrupting a record.

The DB migration adding `wto_triggers_outcome_action` (`documents/db-handoffs/2026-09-03_wto_triggers_outcome_action.sql`) backfilled the flag `true` on the two outcomes the time-off exception-authorization flow already depended on (`APPROVED`/`REJECTED` on the `AUTHORIZE_EXCEPTION` task), so this redesign shipped with no behavior change for that flow — it just made the trigger decision explicit and admin-configurable going forward.

---

## 11a. Domain Side Effects — `DATABASE` Execution Type

A second, parallel mechanism to this section's TypeScript handler registry: a task outcome can be configured to run its side effect as a PostgreSQL stored procedure instead, with no code deploy required to add or change one. Decided **per outcome** (`WtoWorkflowTemplateTaskOutcome.executionType`), not per template — a `CODE`-type template may freely mix in individual `DATABASE`-type outcomes; see the **Execution Type** glossary entry.

**Enforced at publish time** by `ValidateExecutionType.ts`, called alongside `validateRoutingExpressions` in `WorkflowTemplateOrchestrator.publishTemplate()`. Five rules:
1. A `DATABASE`-type template/outcome must have its proc-name column set (`wfl_instantiate_proc_name`/`wto_outcome_proc_name`).
2. A `DATABASE`-type **template** cannot contain a `CODE`-type outcome (an asymmetric rule — the reverse, a `CODE`-type template containing a `DATABASE`-type outcome, is allowed).
3. Every configured proc name must resolve to a real, already-deployed function (checked against `pg_proc`).
4. Every task on a `DATABASE`-type template must have `assignmentType: 'CONTEXT'`; a `CODE`-type template's tasks must not.
5. A `DATABASE`-type template cannot have any `WtdWorkflowTemplateDependency` rows — joins aren't supported on this path.

**Runs instead of the registry lookup, in the same transaction.** `TaskCompletionOrchestrator.ts` Step 6b checks `matchedOutcome.executionType` (not the template's own type) before checking `triggersOutcomeAction`/the registry. If it's `DATABASE`, it calls `invokeDatabaseOutcomeProcedure(tx, ...)` instead: a guarded `$queryRaw` call that re-checks `pg_proc` immediately before invoking (publish-time validation isn't enough on its own — a procedure could be dropped after publish), then calls the procedure with `(winId, witId, outcomeCode, businessReferenceId, performedBy, performedByUserId, params::jsonb)` and reads back `activated_wit_id`/`activated_user_id`.

**The procedure owns routing and completion for this outcome, not the TypeScript engine.** `TaskCompletionOrchestrator.ts` skips Steps 8 (routing engine), 9 (activate next task), and 11 (check instance completion) for this specific outcome — gated on the same per-outcome flag Step 6b set, not the template's own `executionType`, so a `CODE`-type template with a mixed-in `DATABASE`-type outcome doesn't double-run these steps on top of what the procedure already did. Step 10 (writing the `TASK_COMPLETED`/`TASK_FAILED` WAL entry for the just-completed task) still runs unconditionally either way. The procedure performs the equivalent work itself, using four generic primitives written once and shared by every `DATABASE`-type template — `sp_resolve_first_supervisor`, `sp_engine_create_instance`, `sp_engine_insert_task`, `sp_engine_complete_instance_if_done` — all writing to `wal_workflow_audit_log` directly (not through `auditOrchestrator`, which was never routed through that table anyway).

**Audit logging is not exempt on this path.** [Governance/05_AUDIT_LOGGING_RULES.md](../../Governance/05_AUDIT_LOGGING_RULES.md)'s Database-Native Workflow Instantiation Exemption applies only to a template's own *instantiate* procedure, where no TypeScript runs at all — this outcome path always has TypeScript present. `invokeDatabaseOutcomeProcedure`'s return row can optionally carry `entity_name`/`entity_id`/`old_values`/`new_values`/`comment`; when present, `TaskCompletionOrchestrator.ts` logs them via `auditOrchestrator.log(...)` post-commit, exactly like this section's registry handler path. No domain procedure returns these fields yet, so this mechanism is currently inert.

**Instantiation is a separate gap not covered by [§13](#13-instantiation-flow).** `WorkflowInstantiationOrchestrator.instantiate(...)` has no `DATABASE`-type branch — a `DATABASE`-type template's instances are never created through it. A domain that adopts this execution type is expected to trigger instantiation directly from its own database (a trigger or stored procedure calling `sp_engine_create_instance`/`sp_engine_insert_task`), with no TypeScript anywhere on that call path. `PendingNotificationScanner.ts` exists specifically because of this: a task activated this way has no code present to call `notifyWorkflowEvent` synchronously at activation, so a scheduled sweep (same call-once-then-`setInterval` shape as `SlaBreachScanner.ts`, [§8](#8-sla-due-dates--escalation)) picks up any `ON_ASSIGNMENT` notification row nothing has dispatched yet, filtering on `assignmentType: 'CONTEXT'` and an unstamped `lastTriggeredAt`.

**First real adopter: Team Member Change Authorization.** `updateTeamMember.ts` applies a team member edit immediately, then starts a `DATABASE`-type workflow asking a reviewer to authorize it — `APPROVED` is a no-op (the change already happened), `REJECTED` reverts it using the exact `aud_audits` snapshot captured when the edit was made. See [`workflow-database-native-integration-guide.md`](./workflow-database-native-integration-guide.md) for the full walkthrough, including the admin UI fields this needed (§11a below no longer describes a DB-only-configurable path — `WorkflowTemplateOrchestrator` and the admin UI both accept `executionType`/proc names now). Time Off's exception-authorization flow (the [domain integration guide](./workflow-domain-integration-guide.md)) remains entirely `CODE`-type — the two patterns coexist by design.

---

## 12. Instance Context

`WicWorkflowInstanceContext` is a flat key/value bag scoped to an instance (optionally further scoped to a specific task via `witId`). It's populated two ways at instantiation:

1. **Explicit context** — the caller passes a `contextJson` array (`{ key, value }[]`) to `POST /api/workflow/instances`.
2. **Entity-derived context** — if the template has a `wecId` and the instantiation call supplies a `businessReferenceId`, `resolveEntityContext` reads the mapped fields (per `WefWorkflowEntityField.sourceField` → `contextKey`) off the real entity and seeds them automatically.

Context is typed per value column (`valueText`/`valueNumber`/`valueBoolean`/`valueDate`/`valueDatetime`/`valueJson`) rather than stored as a single JSON blob, so it can be queried and filtered directly.

---

## 13. Instantiation Flow

`WorkflowInstantiationOrchestrator.instantiate(...)` runs entirely inside one `prisma.$transaction`:

1. Loads the template — **must** be `status: 'PUBLISHED'`, or `WorkflowNotPublishedError` is thrown.
2. Creates the `WinWorkflowInstance` row (`status: 'ACTIVE'`).
3. Seeds instance context from `contextJson` and/or entity config (§11).
4. Copies every active template task into an instance task (`state: 'PENDING'`), building a `wtkId → witId` map.
5. Copies each task's inputs, dependencies (translated via the map), and notification rules.
6. Activates every task flagged `isStartingTask: true`: stamps `activatedAt`/`dueAt`, resolves its responsible user, and writes `TASK_ACTIVATED` (plus `NO_RESPONSIBLE_FOUND` if applicable) to the workflow audit log.
7. Writes `INSTANCE_STARTED` to the workflow audit log, then — outside the transaction — an application-level `auditOrchestrator.log(...)` entry.

### ⚠️ Known gap — no automatic trigger

The **only** way to call `instantiate(...)` today is `POST /api/workflow/instances`, invoked manually from the **Start Workflow** admin modal (`StartWorkflowModal.tsx`) — an admin picks a template, names the instance, and optionally supplies `businessReferenceType`/`businessReferenceId`/`ownerUserId`. There is no generic event registry or trigger-to-template binding: no domain route (Time Off approval, Hiring execution, etc.) calls `workflowInstantiationOrchestrator.instantiate(...)` automatically today. Wiring a domain event to a template requires adding an explicit call from that domain's own route/orchestrator — see [§16](#16-worked-example--new-hire-onboarding-template).

The Time Off domain is the one exception already wired up: `startExceptionAuthorization` (`src/services/timeoff/components/StartExceptionAuthorization.ts`) calls `instantiate(...)` directly when a time-off request fails only the days-before-notice policy, per [Governance/09_HOLIDAY_SWAPS.md](../../Governance/09_HOLIDAY_SWAPS.md)-adjacent exception-authorization rules — see [§5](#5-task-assignment-model) for the `ownerUserId` nuance this integration exposed.

**A `DATABASE`-execution-type template is instantiated entirely outside this orchestrator** — see [§11a](#11a-domain-side-effects--database-execution-type). `instantiate(...)` has no branch for it; that execution type's instances are created directly by a domain's own DB trigger calling the generic `sp_engine_create_instance`/`sp_engine_insert_task` primitives, with no TypeScript on that call path at all.

---

## 14. Admin Overrides

All three require the `WorkflowAdmin` permission (`create` action) and a mandatory `reason`, and are logged both to `wal_workflow_audit_log` and the generic `auditOrchestrator`:

| Action | Endpoint | Effect |
|---|---|---|
| **Jump** | `POST /api/workflow/instances/:winId/jump` | Voids the instance's current active task(s) (`state → OVERRIDDEN`) and directly activates a chosen `targetWitId` — resolving its responsible party the same way as any other activation ([§5](#5-task-assignment-model)), except when the target's `assignmentType` is `CONTEXT`, which has no resolution algorithm and instead requires the caller to supply `assigneeUserId` in the request body (`AdminJumpAssigneeRequiredError` otherwise) — optionally pre-seeding its inputs. Used to manually skip ahead or recover from a stuck step. |
| **Force Complete** | `POST /api/workflow/instances/:winId/force-complete` | Marks every remaining `ACTIVE`/`PENDING` task `OVERRIDDEN` and the instance `COMPLETED`. |
| **Destroy** | `POST /api/workflow/instances/:winId/destroy` | Marks every remaining `ACTIVE`/`PENDING` task `VOIDED` and the instance `DESTROYED`. Used to cancel an instance that should never have started. |

---

## 15. API Reference

All routes are mounted under `/api/workflow`, wrapped in the standard `{ data: T }` envelope. Every handler is permission-gated by `requirePermission(resource, action)`.

**Templates** (`Workflow` permission for authoring, `WorkflowAdmin` gates the admin UI pages that call them):
| Method & Path | Purpose |
|---|---|
| `POST /templates` | Create a draft template |
| `GET /templates` | List templates (filter by `code`/`status`/`isActive`) |
| `GET /templates/:wflId` | Get one template with tasks/routes/dependencies |
| `PATCH /templates/:wflId` | Update a draft template |
| `POST /templates/:wflId/publish` | Publish (requires ≥1 task) |
| `POST /templates/:wflId/archive` | Archive |
| `POST/PATCH/DELETE /templates/:wflId/tasks[/:wtkId]` | Manage template tasks |
| `POST/PATCH/DELETE /templates/:wflId/tasks/:wtkId/inputs[/:wtiId]` | Manage task inputs |
| `POST/DELETE /templates/:wflId/tasks/:wtkId/outcomes[/:wtoId]` | Manage task outcomes |
| `POST/DELETE /templates/:wflId/routes[/:wtrId]` | Manage routes |
| `POST/DELETE /templates/:wflId/dependencies[/:wtdId]` | Manage dependencies |
| `POST/PATCH/DELETE /templates/:wflId/tasks/:wtkId/notifications[/:wtnId]` | Manage notification rules |

**Instances:**
| Method & Path | Permission | Purpose |
|---|---|---|
| `POST /instances` | `Workflow:create` | Instantiate a published template |
| `GET /instances` | `WorkflowAdmin:read` | List all instances |
| `GET /instances/:winId` | `WorkflowAdmin:read` | Get one instance with all tasks |

**Tasks** (all `Workflow` permission):
| Method & Path | Purpose |
|---|---|
| `GET /inbox` | Current user's task inbox (assigned + claimable) |
| `GET /instances/:winId/tasks` | List tasks on an instance |
| `GET /instances/:winId/tasks/:witId` | Get one instance task with inputs |
| `POST /instances/:winId/tasks/:witId/complete` | Complete a task with an outcome + input values |
| `POST /instances/:winId/tasks/:witId/retry` | Retry a `FAILED` task |
| `POST /instances/:winId/tasks/:witId/claim` / `/unclaim` | Claim/release a `ROLE`-assigned task |
| `POST /instances/:winId/tasks/:witId/reassign` | Reassign to another user/role |

> **Note:** `GET /inbox` and `GET /instances/:winId/tasks/:witId` both include `entityUrl`/`entitySummary` (nullable) on each task, resolved per [§10](#10-entity-links-task-inbox--detail) — the frontend renders them as a link where present and falls back to the instance's plain name otherwise.

> **Note:** `GET /inbox` and `POST .../complete` currently hardcode `isAdmin: false` with a TODO ("full admin override is deferred until a dedicated admin permission is defined for the Workflow resource") — a `WorkflowAdmin` user cannot yet complete/view someone else's task through these endpoints; that's a separate, narrower gap from the three admin-override endpoints above, which already work.

**Admin** (all `WorkflowAdmin` permission):
| Method & Path | Purpose |
|---|---|
| `POST /instances/:winId/jump` | Admin Jump override |
| `POST /instances/:winId/force-complete` | Admin Force Complete override |
| `POST /instances/:winId/destroy` | Admin Destroy override |
| `GET /instances/:winId/audit-log` | Workflow-specific audit trail (optionally filtered by `witId`) |

> **Note:** `POST .../jump`'s body accepts an optional `assigneeUserId` (number) — required when the target task's `assignmentType` is `CONTEXT` (no other assignment type accepts it; see [§5](#5-task-assignment-model)).

---

## 16. Worked Example — New Hire Onboarding Template

This is the concrete example used to validate the design (not yet authored in any environment). It requires **no schema changes** — every piece maps directly onto existing tables.

One `WflWorkflowTemplate` (`code: 'NEW_HIRE_ONBOARDING'`), with 11 `WtkWorkflowTemplateTask` rows:

| # | Task | `assignmentType` | Notes |
|---|---|---|---|
| 1 | Send onboarding email with TM info | `ROLE` (BSA) | Has an `ON_ASSIGNMENT` notification with `emailTemplate` set |
| 2 | Verify computer type with client | `ROLE` (BSA) | |
| 3 | Create ticket to get a computer | `ROLE` (BSA) | Depends on task 2 (`FINISH_TO_START`) |
| 4 | Create ticket for other assets | `ROLE` (BSA) | Can run in parallel with task 3 |
| 5 | Request client access | `ROLE` (BSA) | |
| 6 | Check new-hire folder is complete | `ROLE` (BSA) | |
| 7 | Check Deel contract signed | `ROLE` (BSA) | `PARALLEL_JOIN` predecessor, `joinGroupCode: 'PRE_SHIP'`, alongside 3/4/5/6 |
| 8 | Request laptop + Yubikey shipping | `ROLE` (BSA) | Successor of the `PRE_SHIP` join group |
| 9 | Notify TM that equipment shipped | `ROLE` (BSA) | Notification-only outcome, no separate email step needed — `WtnWorkflowTemplateNotification.emailTemplate` on this task covers it |
| 10 | Create IT ticket for laptop setup | `ROLE` (IT) | |
| 11 | Submit performance bonus form | `ROLE` (BSA) | No outgoing route — this is the last task; the instance auto-completes when it reaches a terminal state |

Each task gets `slaDurationHours` set per your SLA target, and an `ON_ESCALATION` notification if you want the "not completed in N days" reminder — the existing `processSlaBreaches` scanner (already running every 15 minutes) handles the timing with zero new code.

**The one piece that requires actual code**, per the [§13 gap](#13-instantiation-flow): the Hiring execution flow must call `workflowInstantiationOrchestrator.instantiate({ wflId: <NEW_HIRE_ONBOARDING id>, businessReferenceType: 'Hiring', businessReferenceId: String(hiringId), ownerUserId: <new hire's usr_id>, ... })` when a hiring is executed. Until that call is added, the template can only be started manually via the **Start Workflow** admin modal.

If a "Hiring" detail page exists by the time this is wired up, adding a `registerBusinessReferenceLink('Hiring', ...)` resolver (see [§10](#10-entity-links-task-inbox--detail)) alongside the `instantiate(...)` call gets these tasks the same clickable-summary treatment `TimeOff` already has, for free.

---

## 17. Known Gaps / Follow-Up Work

1. **Notification dispatch is a stub** ([§9](#9-notifications)) — `NotificationDispatcher.ts` logs instead of sending. This is the highest-impact gap: every "does it send a notification" configuration in the template builder is currently inert in production.
2. **No trigger-to-template binding** ([§13](#13-instantiation-flow)) — starting an instance from a domain event requires hand-adding a call to `workflowInstantiationOrchestrator.instantiate(...)` inside that domain's own route/orchestrator. There is no generic "event X starts template Y" registry. (Time Off is the one domain that has done this integration today.)
3. **Admin task-inbox override deferred** — `GET /inbox` and the task-complete endpoint hardcode `isAdmin: false` pending a dedicated permission split, so a `WorkflowAdmin` cannot yet act on another user's task through the normal task-completion endpoint (the three dedicated admin-override endpoints in [§14](#14-admin-overrides) are unaffected).
4. **Entity-link resolvers are per-domain, per-task N+1 reads** ([§10](#10-entity-links-task-inbox--detail)) — acceptable at current inbox sizes; would need batching (e.g. a bulk-resolve variant of the resolver signature) if inbox sizes grow substantially.
5. **`DATABASE` execution type has one real adopter** ([§11a](#11a-domain-side-effects--database-execution-type)) — Team Member Change Authorization, walked through end-to-end in [`workflow-database-native-integration-guide.md`](./workflow-database-native-integration-guide.md). That adoption also populates `invokeDatabaseOutcomeProcedure`'s optional audit-snapshot fields for the first time (previously inert), and the admin UI now has fields for `executionType`/proc names on both templates and outcomes (previously DB-only config) — see `TemplateFormPage.tsx`, `TaskOutcomePanel.tsx`, and `TaskFormDrawer.tsx`'s `CONTEXT` option.

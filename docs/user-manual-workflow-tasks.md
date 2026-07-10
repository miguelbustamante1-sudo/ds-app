# Dynamic Task Orchestration System (DTOS) — User Manual

---

## Table of Contents

1. [What is DTOS?](#1-what-is-dtos)
2. [User Roles](#2-user-roles)
3. [Template Management (Admin)](#3-template-management-admin)
4. [Instance Monitor (Admin)](#4-instance-monitor-admin)
5. [Task Inbox — My Tasks](#5-task-inbox--my-tasks)
6. [Task Execution](#6-task-execution)
7. [Reassigning a Task](#7-reassigning-a-task)
8. [Admin Operations on Running Workflows](#8-admin-operations-on-running-workflows)
9. [Audit Trail](#9-audit-trail)
10. [Permissions Reference](#10-permissions-reference)

---

## 1. What is DTOS?

DTOS is a configurable workflow engine built into the DS App. It allows authorized administrators to define multi-step task workflows and launch them against any business process or entity.

**Key concepts:**

| Concept | Description |
|---|---|
| **Template** | A reusable blueprint that defines the tasks, their order, inputs, routing rules, and notifications for a workflow. |
| **Instance** | A live running copy of a template, started against a specific context. Each instance is an immutable snapshot — changes to the template do not affect running instances. |
| **Task** | A single unit of work within an instance. A task is assigned to a user or role and must be completed (with an outcome) to advance the workflow. |
| **Outcome** | The result a user selects when completing a task (e.g. *Approved*, *Rejected*). Outcomes drive routing to the next task. |
| **Context** | Key/value pairs that travel with the instance and can influence routing decisions at runtime. |

---

## 2. User Roles

DTOS has two access levels:

### Workflow User
A team member who receives and executes tasks. They can see their own inbox, complete assigned tasks, claim role-based tasks, and request reassignments.

**Pages accessible:**
- `/my-tasks` — Task inbox
- `/workflow/instances/:winId` — View details of a specific workflow the user is involved in

---

### Workflow Admin
An authorized administrator who manages the full lifecycle of workflow templates and running instances. Required for template creation, publishing, launching workflows, and all emergency interventions.

**Pages accessible:**
- `/admin/workflow/templates` — Template list
- `/admin/workflow/templates/new` — Create template
- `/admin/workflow/templates/:wflId/edit` — Edit template
- `/admin/workflow/instances` — Instance monitor
- `/admin/workflow/instances/:winId` — Instance detail + admin controls

---

## 3. Template Management (Admin)

Navigate to **Admin → Workflow → Templates**.

### 3.1 Template List

The list displays all workflow templates with the following columns:

| Column | Description |
|---|---|
| Code | Unique identifier for the template (e.g. `ONBOARDING_V2`) |
| Name | Human-readable display name |
| Version | Version number within the same code |
| Status | `DRAFT`, `PUBLISHED`, or `ARCHIVED` |
| Active | Whether the template is active |
| Effective From / To | Optional date range the template is valid for |

**Actions available per row:**
- **Edit** — Opens the template editor (DRAFT only)
- **Publish** — Publishes a DRAFT template (requires at least one task)
- **Archive** — Archives a PUBLISHED template

Use the filters at the top to narrow by Status or search by Code or Name. Click **+ New Template** to start a new one.

---

### 3.2 Creating a Template

1. Click **+ New Template**.
2. Fill in the required fields:
   - **Code** — Short unique identifier, no spaces (e.g. `OFFBOARDING_V1`). Cannot change after publishing.
   - **Version** — Numeric version. Must be unique per code.
   - **Name** — Friendly display name.
   - **Description** — Optional summary.
   - **Effective From / To** — Optional date range.
3. Click **Save as Draft**.
4. The page reloads in edit mode showing the **Template Structure** section.

---

### 3.3 Template Structure Tabs

Once saved, three tabs appear: **Tasks**, **Routes**, and **Dependencies**.

#### Tasks Tab

Defines what work must be done. Click **+ Add Task** to open the task drawer.

| Field | Description |
|---|---|
| Code | Unique code for this task within the template |
| Name | Display name |
| Task Type | Type of work (e.g. `REVIEW`, `APPROVAL`, `ACTION`) |
| Assignment Type | `USER` (single user), `ROLE` (anyone in a role), `DYNAMIC` (resolved at runtime by manager/supervisor hierarchy) |
| Assigned User / Role | Fixed user or role for `USER` / `ROLE` assignment types |
| Dynamic Assignment Type | For `DYNAMIC`: `MANAGER` or `FIRST_SUPERVISOR` |
| Priority | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| SLA (hours) | Hours from task activation until due. Leave empty for no SLA. |
| Escalation | User, role, or dynamic target to notify when SLA is breached |
| Max Retries | How many times a failed task can be retried |
| Allow Reassignment | Whether the assignee can be changed after activation |
| Require Comment on Reassign | Forces the reassigning user to provide a reason |
| Allow Fail | Whether the task can produce a failure outcome |
| Is Starting Task | Marks this as the entry point of the workflow. At least one task must be a starting task before publishing. |

Each task has sub-panels for **Inputs**, **Outcomes**, and **Notifications**:

- **Inputs** — Form fields the assignee must fill out when completing the task. Each input has a data type (`TEXT`, `NUMBER`, `BOOLEAN`, `DATE`, `SELECT`), required flag, and optionally is a **routing input** (its value is written to the workflow context to influence downstream routing decisions).
- **Outcomes** — Result codes the assignee can select (e.g. `APPROVED`, `REJECTED`). One outcome can be marked **terminal** (routes to `SUCCESS`); others route to `FAILED`.
- **Notifications** — Email/in-app alerts fired on specific events (`ON_ASSIGNMENT`, `ON_REASSIGNMENT`, `ON_ESCALATION`, `ON_REMINDER`, `ON_NO_RESPONSIBLE_FOUND`).

#### Routes Tab

Defines how the workflow flows between tasks after completion. Click **+ Add Route**.

| Field | Description |
|---|---|
| From Task | The task that has just been completed |
| Condition Type | `OUTCOME_ONLY` (matches a specific outcome code) or `NONE` (unconditional fallback) |
| Outcome | Required for `OUTCOME_ONLY` — the outcome that triggers this route |
| To Task | The task to activate next |
| Route Order | Evaluation order when multiple routes exist for the same task (lower = evaluated first) |

The routing engine evaluates routes in order and takes the first match. An unconditional (`NONE`) route should be placed last as the fallback.

#### Dependencies Tab

Defines parallel join conditions. Use dependencies when multiple tasks must all complete before a single downstream task activates.

| Field | Description |
|---|---|
| Predecessor Task | A task that must complete first |
| Successor Task | The task waiting for all its predecessors |
| Dependency Type | `FINISH_TO_START` (sequential, immediate activation) or `PARALLEL_JOIN` (waits for all required predecessors in the group) |
| Join Group Code | Groups multiple predecessor-successor pairs into a single join gate |
| Required | Whether this predecessor must complete before the join gate opens |

---

### 3.4 Publishing a Template

Publishing makes the template available for launching workflows. Publishing is permanent — a published template cannot be edited; create a new version instead.

**Pre-publish checks performed automatically:**
- At least one starting task exists
- All routing expression keys reference actual routing inputs

Click **Publish** from the Template List or from the form toolbar. Once published, the **Start Workflow** button becomes available on the Instance List page.

---

### 3.5 Archiving a Template

Archiving a published template prevents new workflows from being started with it. Existing running instances are not affected. Click **Archive** from the template list row.

---

## 4. Instance Monitor (Admin)

Navigate to **Admin → Workflow → Instances**.

### 4.1 Instance List

Displays all workflow instances. Each row shows:

| Column | Description |
|---|---|
| Workflow Code | The code of the template this instance was created from |
| Name | The name given when the workflow was started |
| Status | `ACTIVE`, `COMPLETED`, `FAILED`, or `DESTROYED` |
| Started At | Timestamp when the workflow was launched |
| Started By | Email of the user who started it |
| Reference Type / ID | Optional business entity the workflow is linked to |

**Actions per row (admin only):**
- **View** — Opens the instance detail page
- **Force Complete** — Immediately closes the workflow as completed (prompts for a reason)
- **Destroy** — Stops the workflow and voids all remaining tasks (prompts for a reason)

**Starting a new workflow:** Click **+ Start Workflow**, select a published template, provide a name, optional business reference, and optional context key/value pairs.

---

### 4.2 Instance Detail Page

Shows the full state of a running or completed workflow, with two tabs: **Tasks** and **Audit Log**.

#### Tasks Tab

A grid of all tasks in the instance with columns:

| Column | Description |
|---|---|
| Seq | Task sequence number from the template |
| Code / Name | Task identifier and display name |
| State | `PENDING`, `ACTIVE`, `SUCCESS`, `FAILED`, `OVERRIDDEN`, `VOIDED` |
| Assigned To | User or role responsible |
| Priority | LOW / MEDIUM / HIGH / CRITICAL |
| Due At | SLA due date (shown in red if overdue) |
| Completed At | When the task was completed |

Click any row to open a side panel showing full task details: inputs, submitted values, outcome, and comment.

**Admin action buttons (top right, active instances only):**
- **Jump to Task** — Overrides all current and pending tasks and activates a specific target task
- **Force Complete** — Closes the workflow immediately
- **Destroy** — Stops the workflow and voids all remaining tasks

#### Audit Log Tab

The immutable, chronological execution trail for this workflow. Shows every event: task activations, completions, routings, escalations, reassignments, and admin interventions. Cannot be filtered or deleted.

---

## 5. Task Inbox — My Tasks

Navigate to **My Tasks** (main navigation).

Displays all tasks currently assigned to you or available in your role.

### Inbox Columns

| Column | Description |
|---|---|
| Task | Task name with a link to the full workflow view |
| Workflow | Name of the parent workflow instance |
| Priority | LOW / MEDIUM / HIGH / CRITICAL |
| Due Date | SLA deadline. Shows **Overdue** badge in red if past due. |
| SLA Status | On Track / Overdue |
| State | `ACTIVE` or `PENDING` |
| Claim Status | For role-based tasks: whether the task is unclaimed, claimed by you, or claimed by someone else |
| Actions | **Complete**, **Claim / Unclaim** buttons |

### Filtering

Use the column filters to narrow by State, Priority, or SLA Status. Use the text search for Task or Workflow name. Click **Reset** to clear all filters.

---

## 6. Task Execution

### Completing a Task

1. Find the task in **My Tasks** (or click into the workflow from the instance view).
2. Click **Complete**. A drawer opens showing:
   - Task name, description, priority, due date
   - Input form fields (if any) — fill in all required fields
   - Outcome selector — pick the result that best describes what happened
   - Optional comment field
3. Click **Submit**. The system validates all required inputs and transitions the task.

After submission:
- The task moves to `SUCCESS` or `FAILED` depending on the outcome
- Downstream tasks are activated automatically
- Context routing inputs are written to the workflow for use by subsequent routing rules

### Claiming a Role-Based Task

Role-based tasks are visible to all users in the assigned role. To take ownership:

1. Find the task in **My Tasks** — it shows as **Unclaimed**
2. Click **Claim**. The task is now assigned exclusively to you
3. Complete the task as normal

To release ownership back to the role pool, click **Unclaim**. This is only possible if you claimed the task yourself.

> **Note:** You must claim a role-based task before you can complete it. If someone else has already claimed it, the task will show as **Claimed by [name]** and you cannot complete it.

### Retrying a Failed Task

If a task fails and has retries remaining, a **Retry** button appears in the task detail drawer. Retrying resets the task to `ACTIVE` with a fresh SLA due date.

---

## 7. Reassigning a Task

If the task template allows reassignment (`Allow Reassignment = true`):

1. Open the task from **My Tasks** or the workflow detail page
2. Click **Reassign**
3. Select the new assignee (user or role)
4. Enter a reason (mandatory if the template requires it)
5. Click **Confirm**

The previous assignment is recorded in the reassignment history. The new assignee receives a notification.

---

## 8. Admin Operations on Running Workflows

All three operations are only available to users with the **WorkflowAdmin** `create` permission. Each requires a written reason and is fully recorded in the audit log.

### Jump to Task

Use when a task is blocked, irrelevant, or needs to be skipped. Lets an admin bypass the current state and activate any pending task directly.

**Effect:**
- All tasks not in a terminal state (`SUCCESS`, `FAILED`, `OVERRIDDEN`, `VOIDED`) — including both `ACTIVE` and `PENDING` tasks — are set to `OVERRIDDEN`
- The selected target task is activated
- SLA due date is recalculated from the moment of activation
- The responsible user is resolved for the new task

**When to use:** When a task is stuck (no responsible user, external blocker resolved out of band, process needs to skip a step).

---

### Force Complete

Marks the entire workflow as `COMPLETED` regardless of remaining task states.

**Effect:**
- All remaining `ACTIVE` and `PENDING` tasks are set to `OVERRIDDEN`
- Workflow status becomes `COMPLETED`
- The reason and performing admin are recorded

**When to use:** When the business process is done but the system hasn't caught up (e.g. the work was completed outside the system).

---

### Destroy

Immediately cancels the workflow.

**Effect:**
- All remaining `ACTIVE` and `PENDING` tasks are set to `VOIDED`
- Workflow status becomes `DESTROYED`
- The reason and performing admin are recorded

**Distinction from Force Complete:** Destruction means the workflow is cancelled — it should not be treated as done. Force Complete means the outcome was achieved.

**When to use:** When a workflow was started in error, the process is no longer needed, or the business entity it was attached to has been cancelled.

---

## 9. Audit Trail

Every action in DTOS is recorded at two levels:

- **App-level audit** (`ds.wal_audit_log`) — Covers who did what across the entire system. Used for compliance and general audit queries.
- **DTOS execution trail** (`ds.wal_workflow_audit_log`) — Records every workflow state transition, routing decision, task event, escalation, reassignment, and admin action with full before/after state detail. This is immutable — entries cannot be modified or deleted.

The DTOS execution trail is available to admins via the **Audit Log** tab on the Instance Detail page.

### DTOS Event Types

| Event | Triggered by |
|---|---|
| `INSTANCE_STARTED` | Workflow was launched |
| `TASK_ACTIVATED` | A task became ACTIVE (including at instantiation) |
| `TASK_COMPLETED` | Task completed with a SUCCESS outcome |
| `TASK_FAILED` | Task completed with a FAILED outcome |
| `TASK_RETRIED` | Failed task was re-opened for another attempt |
| `TASK_CLAIMED` | Role task was claimed by a user |
| `TASK_UNCLAIMED` | Task was released back to the role pool |
| `TASK_REASSIGNED` | Task was reassigned to a different user or role |
| `TASK_ESCALATED` | SLA was breached and escalation notification was sent |
| `TASK_OVERRIDDEN` | Task was bypassed by a Jump or Force Complete admin action |
| `ROUTE_SELECTED` | Routing engine selected the next task after completion |
| `NO_RESPONSIBLE_FOUND` | Dynamic assignment resolution found no user to assign |
| `INSTANCE_COMPLETED` | All tasks finished normally — workflow closed as COMPLETED |
| `INSTANCE_FAILED` | A task failed with no retries or routes remaining |
| `INSTANCE_FORCE_COMPLETED` | Admin closed the workflow early |
| `INSTANCE_DESTROYED` | Admin cancelled the workflow |

---

## 10. Permissions Reference

DTOS uses two permission resources. Both must be configured in the RBAC system (`sec.per_permissions`) before users can access any DTOS functionality.

### Permission Resources

| Resource | Action | `per_read` | `per_write` | `per_delete` | What it grants |
|---|---|:---:|:---:|:---:|---|
| `Workflow` | read | ✓ | | | View own task inbox, view workflow instance page |
| `Workflow` | create | | ✓ | | Complete tasks, claim/unclaim, retry, reassign, start a workflow instance |
| `WorkflowAdmin` | read | ✓ | | | View template list, instance list, instance detail, audit log |
| `WorkflowAdmin` | create | | ✓ | | Create/edit/publish/archive templates, manage all sub-resources, start workflows, jump, force-complete, destroy |
| `WorkflowAdmin` | delete | | | ✓ | Delete template tasks, inputs, outcomes, routes, dependencies, notifications |

---

### Permissions to Add per Role

The rows below are the SQL inserts required in `sec.per_permissions`. Replace `<role_id>` with the actual `rol_id` from `sec.rol_roles`.

#### Workflow User Role
_Any role whose members need to receive and execute tasks (e.g. Team Members, Managers)._

```sql
-- Workflow: read — see inbox and workflow pages
INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, rol_id)
VALUES ('Workflow', true, false, false, 'View task inbox and workflow instances', <workflow_user_role_id>);

-- Workflow: create — complete tasks, claim, retry, reassign, start workflows
INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, rol_id)
VALUES ('Workflow', false, true, false, 'Execute tasks, claim, retry, reassign, start workflow instances', <workflow_user_role_id>);
```

#### Workflow Admin Role
_Administrators responsible for template management, instance monitoring, and emergency interventions._

```sql
-- WorkflowAdmin: read — view templates, instances, audit log
INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, rol_id)
VALUES ('WorkflowAdmin', true, false, false, 'View workflow templates, instances, and audit log', <workflow_admin_role_id>);

-- WorkflowAdmin: create — create/publish/archive templates, jump/force-complete/destroy instances
INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, rol_id)
VALUES ('WorkflowAdmin', false, true, false, 'Manage workflow templates and perform admin interventions on instances', <workflow_admin_role_id>);

-- WorkflowAdmin: delete — remove tasks, inputs, outcomes, routes, dependencies, notifications from templates
INSERT INTO sec.per_permissions (per_resource, per_read, per_write, per_delete, per_description, rol_id)
VALUES ('WorkflowAdmin', false, false, true, 'Delete template sub-resources (tasks, inputs, outcomes, routes, dependencies, notifications)', <workflow_admin_role_id>);
```

> Workflow Admins also need the base `Workflow` read + create permissions if they are also expected to execute tasks themselves. If the admin role is purely operational and admins do not participate in task execution, the `Workflow` entries can be omitted.

---

### Minimum Permission Matrix by Role Type

| Role | `Workflow` read | `Workflow` create | `WorkflowAdmin` read | `WorkflowAdmin` create | `WorkflowAdmin` delete |
|---|:---:|:---:|:---:|:---:|:---:|
| Regular team member (task executor) | ✓ | ✓ | | | |
| Manager (executes tasks + starts workflows) | ✓ | ✓ | | | |
| Workflow Admin (template + instance management) | ✓* | ✓* | ✓ | ✓ | ✓ |
| Read-only observer | ✓ | | ✓ | | |

_* Only if the admin also participates in task execution._

---

### How the RBAC Permission Check Works

The `requirePermission(resource, action)` middleware resolves the calling user's roles, loads all `sec.per_permissions` rows for those roles where `per_resource = resource`, and checks the relevant boolean column:

| Action string | DB column checked |
|---|---|
| `read` | `per_read` |
| `create` | `per_write` |
| `delete` | `per_delete` |

A user passes the check if **any** of their roles has a matching permission row with the relevant column set to `true`.

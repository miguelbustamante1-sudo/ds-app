# Workflow Engine — User Manual

> **Version 1.1 · August 2026**
> This manual covers the Workflow Engine: working your assigned tasks from the Task Inbox, and — for administrators — building, publishing, starting, and monitoring workflow templates.

---

## What is a Workflow?

A workflow is a multi-step process made of individual **tasks**, each with its own assignee, deadline, and outcome. A **Workflow Template** is the reusable blueprint (e.g. "New Hire Onboarding" — a sequence of onboarding steps). A **Workflow Instance** is one live run of that template for a specific real case (e.g. one particular new hire).

Anyone whose role can be assigned tasks will see them in their **Task Inbox**. Building templates, starting instances, and monitoring or intervening in a running workflow are administrator actions.

---

## Quick-Reference: How a Workflow Runs

```
[ Workflow Template published ]
              │
              │  an administrator starts it against a specific case
              ▼
[ Workflow Instance — ACTIVE ]
              │
              │  starting task(s) activate automatically
              ▼
[ Task — ACTIVE ]  ◄── assigned to a person, a role (claimable), or resolved dynamically
              │
              │  assignee completes it with an outcome
              ▼
[ Task — SUCCESS or FAILED ]
              │
              │  routing / dependency rules decide what activates next
              ▼
        ... more tasks ...
              │
              │  no tasks remain to activate
              ▼
[ Workflow Instance — COMPLETED or FAILED ]
```

| Task State | What it means |
|---|---|
| **Pending** | Not yet reached — waiting on a predecessor or dependency |
| **Active** | Currently assigned and awaiting action |
| **Success** | Completed with a successful outcome |
| **Failed** | Completed with a failing outcome, or can be retried if retries remain |
| **Overridden** | Skipped by an administrator action (Jump or Force Complete) |
| **Voided** | Cancelled because the whole instance was destroyed |

| Instance Status | What it means |
|---|---|
| **Active** | Currently running |
| **Completed** | Finished successfully |
| **Failed** | Ended without completing (a task failed with no retries left and no path forward) |
| **Destroyed** | Cancelled by an administrator |

---

## Part 1 — Working Your Task Inbox

### Where to find it

Navigate to **Tasks → My Tasks → Task Inbox**, or go directly to **My Tasks** (`/my-tasks`). If you also have standalone tasks, they appear on a separate tab — this manual covers the **Workflow Tasks** tab.

### 1.1 What you see

A list of every task currently assigned to you, or open to be claimed by anyone in your role. Each row shows the task name, priority, due date, and current state.

If a task is tied to a specific record elsewhere in the app — like a time-off request — the row shows a short summary of that record instead of the workflow's generic name (e.g. "Jane Doe — Vacation, 12-Sep-2026 to 15-Sep-2026"), and it's a link straight to that record's own detail page. Not every task is tied to a record this way; when one isn't, the row just shows the workflow's name as plain text.

### 1.2 Claiming a role-based task

Some tasks aren't assigned to one specific person — they're open to your entire role (e.g. "any BSA team member"). Open the task and click **Claim** before you can complete it. If you start working on it and can't finish, click **Unclaim** to release it back to the group.

### 1.3 Completing a task

Click a task to open its details panel. You'll see:

- The same record summary/link described above, if the task is tied to one — click it to jump straight to that record's own page.
- The task's description and due date.
- Any **input fields** the task asks for (text, number, date, yes/no, or a dropdown — set up per the template).
- An **Outcome Code** field — enter the outcome that reflects how the task was resolved (e.g. `APPROVED`, `DONE`). Ask your administrator what outcome codes a given task expects if you're unsure.
- An optional **Comment** field.

Fill in any required inputs and the outcome, then click **Complete**. The workflow automatically moves to whatever comes next based on that outcome — you don't need to do anything else.

### 1.4 Retrying a failed task

If a task shows as **Failed** and still has retries available, a **Retry** button appears, reopening it as Active so you can try again.

### 1.5 Reassigning a task

If a task allows reassignment, click **Reassign** from its details panel and choose a different person or role. Some tasks require a reason for reassignment — if so, you'll be prompted for one.

---

## Part 2 — Viewing a Workflow Instance

If you started a workflow (or are its owner), you can open its full detail page from a link on the instance (`/workflow/instances/:winId`) to see every task in the run, its current state, and its history — useful for tracking a case beyond just your own task.

---

## Part 3 — Administration: Workflow Templates

> Requires the **Workflow Admin** permission.

### Where to find it

Navigate to **Tasks → Administration → Workflow Templates** (`/admin/workflow/templates`).

### 3.1 Creating a template

Click **New Template** (or navigate to `/admin/workflow/templates/new`). Fill in:

| Field | Required | Notes |
|---|---|---|
| **Code** | Yes | A short unique identifier (e.g. `NEW_HIRE_ONBOARDING`). Cannot be changed once published. |
| **Version** | Yes | Starts at 1; a new version is a new template row. |
| **Name** | Yes | Display name. |
| **Description** | No | |
| **Effective From / To** | No | Optional validity window. |

Click **Save as Draft**. Once saved, you can build out the template's structure below.

### 3.2 Building the template structure

A saved draft template has three tabs:

**Tasks tab** — click **Add Task** to define each step. For every task:
- **Name / Description**
- **Assignment Type**: `User` (a specific person), `Role` (open to a team — first to claim it), or `Dynamic` (resolved automatically — e.g. the case owner's manager).
- **Priority**
- **SLA Duration (hours)** — how long the assignee has before the task counts as overdue and gets escalated. Leave blank for no deadline.
- **Max Retry Count** — how many times a failed task can be retried.
- **Starting Task** toggle — mark every task that should activate the moment the workflow starts (usually just the first step).

Within a task's own detail view you can also configure:
- **Inputs** — the fields the assignee fills in when completing it.
- **Outcomes** — the possible completion results (e.g. `APPROVED`/`REJECTED`), each flagged as terminal (success) or not (failure). Check **Triggers Outcome Action** when choosing this outcome should automatically trigger an effect on the linked record — for example, on the time-off exception-authorization template, `APPROVED` and `REJECTED` are both flagged this way: approving moves the linked request to Tentative, rejecting moves it to Rejected, the moment that outcome is chosen.
- **Notifications** — who gets told what, and when: on assignment, on reassignment, as a reminder, or on escalation. Each notification can include an in-app message and an email body.

**Routes tab** — connect one task's outcome to the next task that should activate. Leave the outcome blank to always route the same way regardless of outcome; pick a specific outcome to branch.

**Dependencies tab** — link a predecessor task to a successor. Use **Finish to Start** for simple ordering, or **Parallel Join** (with a shared join group code) when several tasks must *all* finish before the next one can start.

### 3.3 Publishing

Once the template has at least one task, click **Publish**. A published template can no longer be edited — to make changes, create a new version.

> **Heads up:** at this time, starting an instance of a published template is a manual step (see [Part 4](#part-4--administration-starting--monitoring-instances)) — templates are not yet automatically triggered by other events in the app (e.g. an approval elsewhere in the system). Ask your BSA/dev team if you need a specific action to auto-start a workflow.

---

## Part 4 — Administration: Starting & Monitoring Instances

> Requires the **Workflow Admin** permission.

### Where to find it

Navigate to **Tasks → Administration → Workflow Instances** (`/admin/workflow/instances`).

### 4.1 Starting a new instance

Click **Start Workflow**. Choose:

| Field | Required | Notes |
|---|---|---|
| **Template** | Yes | Must be a published template. |
| **Instance Name** | Yes | A label for this specific run. |
| **Owner** | No | The user this instance is run on behalf of — used to resolve "Dynamic" assignments like "the owner's manager." |
| **Business Reference Type / ID** | No | Optionally link this instance to a specific record elsewhere in the app. |

Submitting immediately activates the template's starting task(s).

### 4.2 Monitoring instances

The instance list shows every instance with its status (Active/Completed/Failed/Destroyed), filterable and sortable. Click a row to open its detail page, showing every task with its current state, timestamps, and the dedicated workflow audit log for that run.

### 4.3 Admin overrides

From an instance's detail page, three actions are available — all require you to enter a reason, which is recorded permanently:

- **Jump** — force the instance to skip ahead to a chosen task, voiding whatever was active.
- **Force Complete** — override every remaining task and mark the whole instance Completed.
- **Destroy** — cancel every remaining task and mark the whole instance Destroyed. Use this for instances that should never have been started.

Use these sparingly — they bypass the template's normal rules and are meant for exceptional recovery, not routine operation.

---

## Permissions Reference

| Permission | Grants |
|---|---|
| `Workflow` (read) | View the Task Inbox and template/instance details you're involved in |
| `Workflow` (create) | Complete, claim, unclaim, retry, and reassign your own tasks; author template content; start instances |
| `WorkflowAdmin` (read) | View the full instance list and any instance's detail/audit log |
| `WorkflowAdmin` (create) | Perform Jump, Force Complete, and Destroy overrides |

If you don't see the Workflow Templates or Workflow Instances options under the Tasks hub, ask your administrator to grant the appropriate permission.

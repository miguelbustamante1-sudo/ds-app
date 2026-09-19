# How-To: Add a New Domain Integration to the Workflow Engine

**Audience:** backend devs wiring a new business process into the existing Workflow Engine.
**Prerequisite reading:** [`workflow-engine.md`](./workflow-engine.md) — this guide assumes you already know the vocabulary (`businessReferenceType`, template vs instance, outcome, `triggersOutcomeAction`) defined there, especially [§10](./workflow-engine.md#10-entity-links-task-inbox--detail), [§11](./workflow-engine.md#11-domain-side-effects-outcome-handlers), and [§13](./workflow-engine.md#13-instantiation-flow).

This guide answers a narrower question than the reference doc: **"I have a task that needs a review/approval step — when it's approved I need to update a row, and when it's denied I need to change some status. What files do I actually create?"**

Rather than a hypothetical, we walk through the **one integration that already exists and ships today**: Time Off's exception-authorization flow. A time-off request that fails only the days-before-notice policy is saved as `InAuth` instead of being blocked outright, routed through a workflow task, and flipped to `Tentative` or `Rejected` depending on how that task is completed. Every file referenced below is real — read them alongside this guide.

This guide covers `CODE` execution type — the outcome side effect runs as a TypeScript handler you write and deploy. If you'd rather that side effect run as a stored procedure with no code deploy needed to add or change it, see [`workflow-database-native-integration-guide.md`](./workflow-database-native-integration-guide.md) instead, walked through via Team Member Change Authorization.

---

## 0. Decide these three things first

Before writing any code, pin down:

1. **`businessReferenceType`** — the string key that ties a workflow instance back to your domain's record. Time Off uses `'TimeOff'`. Pick one; it must be unique across the app and match whatever your domain's Prisma model represents.
2. **Which domain owns this** — per [Governance/02_BACKEND_ARCHITECTURE.md](../../Governance/02_BACKEND_ARCHITECTURE.md), all new code lives under `src/services/[domainName]/`. Time Off's pieces all live in `src/services/timeoff/components/`.
3. **The outcome codes** and what each one does to the data — write this down as a table before touching code. Time Off's table looks like this:

   | Outcome code | Meaning | Mutation |
   |---|---|---|
   | `APPROVED` | Exception authorized | `TimeOff.statusId` → `Tentative (1)` — the normal starting status any request gets |
   | `REJECTED` | Exception denied | `TimeOff.statusId` → `Rejected (5)` |

Skipping this step is the most common source of rework — the outcome codes and the template's outcome rows must match **exactly** (case-sensitive string equality), and they're configured in two different places (admin UI template builder vs. your constants file).

---

## 1. Author the workflow template (admin UI, not code)

In `/admin/workflow/templates`:

1. Create a template with a unique `code`. Time Off's is `TIMEOFF_EXCEPTION_AUTH` — see `TIMEOFF_EXCEPTION_AUTH_TEMPLATE_CODE` in `src/services/timeoff/components/ExceptionAuthorizationConstants.ts`.
2. Add the task (Time Off's is "Authorize Exception") with `assignmentType` set appropriately — Time Off uses `DYNAMIC`/`FIRST_SUPERVISOR`, resolving up from the instance's `ownerUserId` (see step 3's note on `ownerUserId`).
3. Add its outcomes — Time Off has exactly two, `APPROVED` and `REJECTED`, matching `AUTHORIZE_EXCEPTION_OUTCOME_APPROVED`/`AUTHORIZE_EXCEPTION_OUTCOME_REJECTED` in the constants file.
4. **On each outcome that should trigger your code**, open the outcome's Outcome Details panel and set `wto_triggers_outcome_action = true`. This is the flag that decides whether the engine calls your handler at all — see [workflow-engine.md §11](./workflow-engine.md#11-domain-side-effects-outcome-handlers). If you forget this, your handler is registered correctly but silently never runs. (This flag was backfilled `true` on Time Off's two outcomes by the migration `documents/db-handoffs/2026-09-03_wto_triggers_outcome_action.sql` — new integrations set it by hand in the builder.)
5. Publish the template. **A handler you write against a `DRAFT` template's outcome codes does nothing** — `instantiateXWorkflow` only finds `PUBLISHED` templates (`InstantiateExceptionAuthorizationWorkflow.ts` filters `status: 'PUBLISHED'`). If no published template exists, Time Off's own instantiation call simply returns `false` and the record stays `InAuth` with no active workflow — nothing errors.

If this workflow needs to *start automatically* from a domain event (rather than only via the admin "Start Workflow" modal), you'll wire that in step 3 below — this is [workflow-engine.md §13's documented gap](./workflow-engine.md#13-instantiation-flow): there is no generic trigger-to-template binding, so the calling code has to be added explicitly. Time Off is the one domain that has already done this.

---

## 2. Constants file

`src/services/timeoff/components/ExceptionAuthorizationConstants.ts`:

```ts
/**
 * Shared identifiers for the time-off "exception authorization" workflow —
 * a request that fails the days-before notice policy is saved as InAuth and
 * routed through this workflow template instead of being blocked outright.
 *
 * These string/id values are the coupling point between this code and the
 * template authored in /admin/workflow/templates — they must match exactly
 * what's configured there (outcome codes, template code).
 */

export const TIMEOFF_EXCEPTION_AUTH_TEMPLATE_CODE = 'TIMEOFF_EXCEPTION_AUTH';

export const AUTHORIZE_EXCEPTION_OUTCOME_APPROVED = 'APPROVED';
export const AUTHORIZE_EXCEPTION_OUTCOME_REJECTED = 'REJECTED';

export const TIMEOFF_STATUS_IN_AUTH = 7; // 'InAuth'
export const TIMEOFF_STATUS_TENTATIVE = 1; // 'Tentative'
export const TIMEOFF_STATUS_REJECTED = 5; // 'Rejected'
```

Keep these as named constants, not magic strings/numbers inline — the handler and the admin-configured template are only coupled through these values, so any drift is invisible until it silently no-ops in production ([workflow-engine.md §11](./workflow-engine.md#11-domain-side-effects-outcome-handlers) explains why an unrecognized outcome code degrades to a no-op rather than an error).

---

## 3. Entry point that saves the record and starts the workflow

Time Off's entry point is `src/services/timeoff/components/StartExceptionAuthorization.ts` (there's an edit-time counterpart, `StartExceptionAuthorizationOnEdit.ts`, that follows the same shape against `updateTimeOff`):

```ts
export async function startExceptionAuthorization(
  input: StartExceptionAuthorizationInput,
): Promise<StartExceptionAuthorizationResult> {
  const created = await createTimeOff(
    input.teamMemberId,
    input.timeOffStartDate,
    input.timeOffEndDate,
    input.requestedByUserId,
    new Date().toISOString(),
    input.categoryId,
    TIMEOFF_STATUS_IN_AUTH,
    input.totalDays,
    undefined,
    true, // timeOffIsException
    input.vacationPeriod,
  );

  const newRaw = await fetchRawTimeOffRow(created.timeOffId);

  await createTimeOffChangeLog({
    timeOffId: created.timeOffId,
    comment: 'Time-off request saved pending exception authorization (insufficient notice)',
    oldValues: null,
    newValues: newRaw,
    createdByUserId: input.requestedByUserId,
  });

  await auditOrchestrator.log({
    entityName: 'tbl_tms_time_off',
    entityId: String(created.timeOffId),
    createdBy: input.requestedByEmail,
    oldValues: null,
    newValues: newRaw,
    comment: 'Time-off request created pending exception authorization',
  });

  const workflowStarted = await instantiateExceptionAuthorizationWorkflow({
    timeOffId: created.timeOffId,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.requestedByEmail,
  });

  return { created, workflowStarted };
}
```

Note the shape here: the record is saved with the "in progress" status (`InAuth`) and audited **first**, then the workflow is instantiated. This is called from the route handlers, after `validateTimeOff(...)` determines the only failure is the days-before-notice rule (`isOnlyDaysBeforeNoticeFailure`) — see `supervisor.routes.ts` and `myRequests.routes.ts`.

The instantiation itself is a separate, smaller component — `src/services/timeoff/components/InstantiateExceptionAuthorizationWorkflow.ts`:

```ts
export async function instantiateExceptionAuthorizationWorkflow(
  input: InstantiateExceptionAuthorizationWorkflowInput,
): Promise<boolean> {
  const template = await prisma.wflWorkflowTemplate.findFirst({
    where: { code: TIMEOFF_EXCEPTION_AUTH_TEMPLATE_CODE, status: 'PUBLISHED' },
    select: { wflId: true },
  });

  if (!template) {
    return false;
  }

  await workflowInstantiationOrchestrator.instantiate({
    wflId: template.wflId,
    winName: `Time-off exception authorization — request #${input.timeOffId}`,
    businessReferenceType: 'TimeOff',
    businessReferenceId: String(input.timeOffId),
    ownerUserId: input.requestedByUserId,
    startedBy: input.requestedByEmail,
    createdBy: String(input.requestedByUserId),
  });

  return true;
}
```

**`ownerUserId` is deliberate, not automatic.** It's set to `requestedByUserId` — whoever *initiated* the request — specifically so `DYNAMIC`/`FIRST_SUPERVISOR` assignment resolves to that person's own supervisor. When a supervisor files an exception on a direct report's behalf, `ownerUserId` is the supervisor, not the report — otherwise the task would resolve back to the supervisor who already made the call. See [workflow-engine.md §5](./workflow-engine.md#5-task-assignment-model) for the general rule this integration established.

---

## 4. Outcome handler

`src/services/timeoff/components/HandleExceptionAuthorizationOutcome.ts`, implementing the `OutcomeHandler` type from `WorkflowOutcomeRegistry.ts`:

```ts
export async function handleExceptionAuthorizationOutcome(
  ctx: OutcomeHandlerContext,
): Promise<(() => Promise<void>) | undefined> {
  const timeOffId = Number(ctx.businessReferenceId);
  if (!Number.isFinite(timeOffId)) {
    console.error(
      'HandleExceptionAuthorizationOutcome: non-numeric businessReferenceId',
      ctx.businessReferenceId,
    );
    return undefined;
  }

  let newStatusId: number;
  let outcomeLabel: string;
  if (ctx.outcomeCode === AUTHORIZE_EXCEPTION_OUTCOME_APPROVED) {
    newStatusId = TIMEOFF_STATUS_TENTATIVE;
    outcomeLabel = 'authorized';
  } else if (ctx.outcomeCode === AUTHORIZE_EXCEPTION_OUTCOME_REJECTED) {
    newStatusId = TIMEOFF_STATUS_REJECTED;
    outcomeLabel = 'rejected';
  } else {
    // Unrecognized outcome code for this task — nothing to do.
    return;
  }

  const oldRaw = await fetchRawTimeOffRow(timeOffId, ctx.tx);

  await ctx.tx.timeOff.update({
    where: { timeOffId },
    data: { statusId: newStatusId },
  });

  return async () => {
    const newRaw = await fetchRawTimeOffRow(timeOffId);

    await createTimeOffChangeLog({
      timeOffId,
      comment: `Time-off exception ${outcomeLabel} via workflow authorization`,
      oldValues: oldRaw,
      newValues: newRaw,
      createdByUserId: Number(ctx.performedByUserId) || null,
    });

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(timeOffId),
      createdBy: ctx.performedBy,
      oldValues: oldRaw,
      newValues: newRaw,
      comment: `Time-off exception ${outcomeLabel} via workflow authorization`,
    });
  };
}
```

Points that are easy to get wrong here, per [Governance/05_AUDIT_LOGGING_RULES.md](../../Governance/05_AUDIT_LOGGING_RULES.md) and [workflow-engine.md §11](./workflow-engine.md#11-domain-side-effects-outcome-handlers):

- **Do the mutation through `ctx.tx`**, never the global `prisma` client — `ctx.tx.timeOff.update(...)` is atomic with the task-completion write. If the handler throws, the whole task completion rolls back instead of leaving the task marked done with a stale domain record.
- **Fetch the "before" snapshot before the mutation, inside the same transaction** — `fetchRawTimeOffRow(timeOffId, ctx.tx)` — so the audit log's `oldValues` is accurate. Time Off's changelog rule ([CLAUDE.md rule 3.12](../../CLAUDE.md)) additionally requires this to be the **full raw DB row** with real column names (`tto_stadat`, `sta_id`, etc.), not a partial Prisma model — that's exactly why `fetchRawTimeOffRow` exists rather than reusing whatever the `update()` call returns.
- **Do the audit/changelog write in the returned callback**, not inside the handler body — that callback runs after the transaction commits, using the global Prisma client. This is why the handler's return type is `Promise<(() => Promise<void>) | undefined>` rather than `Promise<void>`.
- **`entityName` in `auditOrchestrator.log(...)` is the `@@map(...)` table name** — `tbl_tms_time_off`, not `TimeOff`.
- **The `as unknown as Record<string, unknown>` cast is only acceptable inside `auditOrchestrator.log(...)`** — Time Off's calls here don't need it because `fetchRawTimeOffRow` already returns a raw, untyped row; if your domain passes a typed Prisma result instead, that's where the cast goes, and nowhere else.
- **An unrecognized `outcomeCode` returns `undefined`, not a thrown error** — a misconfigured outcome degrades gracefully instead of corrupting a record.

---

## 5. Register the handler at startup

`src/index.ts`:

```ts
import { registerOutcomeHandler } from './services/workflow/components/WorkflowOutcomeRegistry';
import { handleExceptionAuthorizationOutcome } from './services/timeoff/components/HandleExceptionAuthorizationOutcome';

registerOutcomeHandler('TimeOff', handleExceptionAuthorizationOutcome);
```

The registry is a `Map` keyed by `businessReferenceType` — one handler per type, registered once. If you reuse `'TimeOff'` for something unrelated, this call silently overwrites the existing registration (last registration wins) — don't reuse a `businessReferenceType` string another domain already owns.

---

## 6. (Optional) Give it a clickable task-inbox summary

Time Off also registers a `BusinessReferenceLinkRegistry` resolver so its tasks show something more useful in `/my-tasks` than the raw `winName` — see [workflow-engine.md §10](./workflow-engine.md#10-entity-links-task-inbox--detail). `src/services/timeoff/components/GetTimeOffTaskSummary.ts`:

```ts
export async function getTimeOffTaskSummary(
  timeOffId: string,
): Promise<BusinessReferenceLink | null> {
  const id = parseInt(timeOffId, 10);
  if (Number.isNaN(id)) return null;

  const timeOff = await prisma.timeOff.findUnique({
    where: { timeOffId: id },
    include: { teamMember: true, category: true },
  });

  if (!timeOff) return null;

  const person = timeOff.teamMember
    ? `${timeOff.teamMember.teamMemberNames} ${timeOff.teamMember.teamMemberSurnames}`
    : 'Unknown employee';
  const category = timeOff.category?.categoryName ?? 'Time off';
  const dateRange = `${formatDate(timeOff.timeOffStartDate)} to ${formatDate(timeOff.timeOffEndDate)}`;

  return {
    url: `/timeoff-detail/${timeOff.timeOffId}`,
    summary: `${person} — ${category}, ${dateRange}`,
  };
}
```

registered in `src/index.ts` right alongside the outcome handler:

```ts
import { registerBusinessReferenceLink } from './services/workflow/components/BusinessReferenceLinkRegistry';
registerBusinessReferenceLink('TimeOff', getTimeOffTaskSummary);
```

This is independent of the outcome handler — skip it if the default instance name is fine for now. Note the person's name here follows [Governance/04_DATA_AND_NAMING_RULES.md](../../Governance/04_DATA_AND_NAMING_RULES.md)'s display-name rule: `teamMemberNames + " " + teamMemberSurnames`, not `teamMemberKnownAs`.

---

## 7. Verify end-to-end before calling it done

1. Publish the template in the admin UI.
2. Trigger your instantiation call (step 3) against a real (or test) record — confirm a `WinWorkflowInstance` is created with the right `businessReferenceType`/`businessReferenceId`. For Time Off, this means submitting a request inside the notice window and confirming it lands as `InAuth` with an active task, not a 400.
3. Complete the task with each outcome in turn and confirm:
   - The domain row actually changed as expected (`InAuth → Tentative` / `InAuth → Rejected`).
   - An `auditOrchestrator.log(...)` entry and, for Time Off specifically, a `createTimeOffChangeLog(...)` entry were written with correct `oldValues`/`newValues`.
   - A task completed with an outcome that has `wto_triggers_outcome_action = false` does **not** invoke your handler (sanity check that the gating is template-driven, not hardcoded).
4. Check the workflow-specific audit trail (`GET /instances/:winId/audit-log`) shows `TASK_ACTIVATED`/`INSTANCE_STARTED`/etc. as expected — this is separate from your own `auditOrchestrator` entries (see [workflow-engine.md](./workflow-engine.md)'s Glossary entry for `wal`).

---

## Checklist summary

- [ ] Picked a unique `businessReferenceType` and confirmed which domain owns the new files
- [ ] Wrote down the outcome-code → mutation table
- [ ] Authored and **published** the template, with `triggersOutcomeAction = true` on the outcomes that need it
- [ ] `[Domain]Constants.ts` — template code + outcome codes + any status ids, as named constants
- [ ] Entry point that saves/updates the record with its "in progress" status, audits that write, then calls `Instantiate[X]Workflow.ts` — with a deliberately-chosen `ownerUserId`
- [ ] `Handle[X]Outcome.ts` — mutates through `ctx.tx`, snapshots before/after, returns a post-commit callback that calls `auditOrchestrator.log(...)`, falls through safely on an unrecognized outcome code
- [ ] Registered the handler in `src/index.ts` under the correct `businessReferenceType`
- [ ] (Optional) Registered a `BusinessReferenceLinkRegistry` resolver for task-inbox display
- [ ] Manually verified both outcome paths end-to-end

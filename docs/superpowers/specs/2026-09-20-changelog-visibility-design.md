# Changelog Visibility: Time-Off and Holiday Swaps

## Problem

The time-off changelog card (shown in supervisor time-off detail, employee time-off detail, and exception detail views) only displays a comment, author, and date. It does not show what actually changed on the record, even though the backend already captures full before/after snapshots for every mutation.

Holiday swaps have no change-history UI at all. Every swap mutation is logged to the generic `aud_audits` table via `auditOrchestrator.log(...)`, but nothing ever reads that data back for display.

## Goals

- Show field-level "what changed" detail for time-off changelog entries, not just the comment.
- Add an equivalent change-history view for holiday swaps, which currently has none.
- Keep both consistent in look and interaction from the user's perspective, even though they're sourced from two different backend mechanisms.

## Non-goals

- No new dedicated changelog table for holiday swaps (see "Why audit, not changelog" below).
- No history UI on employee-facing swap views (`my-profile`, `my-team` profile sections) — supervisor and BSA-exception flows only.
- No changes to the generic audit log system's write path, or to how time-off's changelog is written.

## Scope discovery: the BSA exception flow has no detail page

Research during planning found that the TM/supervisor and BSA-exception flows are more different than the original spec assumed:

- **TM/supervisor**: a single shared page, `client/src/pages/holiday-swaps/detail/index.tsx`, reached by navigating to `/holiday-swaps/:swapId`. Backed by `GET /api/holiday-swaps/:id` (`src/routes/holidaySwap.routes.ts`), gated by `requirePermission('HolidaySwaps', 'read')`.
- **BSA exception**: no detail page exists at all. `client/src/pages/holiday-swaps/exception/index.tsx` lists a team member's swaps inline (`ExceptionSwapList`) with edit/cancel/review handled by inline dialogs and inline edit-mode (`ExceptionSwapForm`, `CancelSwapDialog`, `ReviewOverrideDialog`) — there is no navigation to a per-swap page. Backend reads/writes live in a **separate router**, `src/routes/holidaySwapException.routes.ts`, gated by a **separate permission module**, `requirePermission('HolidaySwapException', ...)`, and there is no single-swap-detail GET route today (only `GET /exception/:teamMemberId` listing all of a team member's swaps).

Given this, "add a history panel to the BSA exception detail view" isn't possible as originally scoped — that view doesn't exist. The approved resolution is to **build a full exception detail page**, mirroring the TM/supervisor one, and **migrate the existing inline edit/cancel/review actions from the list into it** (list keeps navigation into the page; the page hosts the actions and the new history section). This is a larger, additive change to the holiday-swap exception UI, not just a display fix — called out explicitly per the workaround-protocol spirit of surfacing scope changes rather than absorbing them silently.

## Why audit, not changelog, for holiday swaps

Two different mechanisms already exist in this codebase for capturing before/after change data:

- **`TimeOffChangeLog`** (`toc_*` table) is a dedicated, domain-specific table built for time-off. Governance rule 3.12 requires it to store full raw DB row snapshots specifically so `vw_timeoff_changelog_activity` and financial triage queries can diff real column names — a requirement unique to time-off's payroll sensitivity.
- **`aud_audits`** (generic `Audit` model, written via `auditOrchestrator.log`) is the cross-entity mechanism used by 100+ call sites across the app, including holiday swaps (9 call sites across `HolidaySwapOrchestrator.ts` and `BsaHolidaySwapOrchestrator.ts`), each already passing full before/after row snapshots.

Holiday swaps were already writing full snapshots into `aud_audits`; nothing ever read them back. Building a new dedicated changelog table for holiday swaps would require a schema migration (handed to the DB team per governance 3.1) and rewiring all 9 existing write call sites, to duplicate data already captured. Reading from `aud_audits` requires no schema change and no changes to any existing write path.

Both mechanisms feed the same shared frontend component, so the distinction is invisible to end users.

## Design

### Shared frontend component

New component: `client/src/components/changelog/ChangeLogDiff.tsx`.

Props: `{ oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null, fieldMap: FieldMapEntry[], comment: string, createdByUserName: string | null, createdDate: string }`.

Renders:
1. An action-type badge — **Created** / **Updated** / **Cancelled** / **Approved** / **Rejected** — derived from the old/new values (never parsed from comment text, since comment wording is free text and not guaranteed stable):
   - `oldValues === null` → **Created**
   - `active` (or equivalent) flips true→false → **Cancelled**
   - status id transitions to an Approved/Rejected status → **Approved**/**Rejected**
   - otherwise → **Updated**
2. The existing comment text.
3. The existing author + formatted date line.
4. A collapsed-by-default summary toggle: **"N changes"** (or **"Change details"** for a Created entry with nothing to diff against).
5. When expanded, one line per changed field: `Label — Old: <value>, New: <value>` (for Created entries, `Label — New: <value>` only, listing the initial field values).

Only fields present in `fieldMap` and where old ≠ new are shown. Unmapped/unlisted DB columns are never surfaced, even if technically changed, to avoid noisy/technical entries (curated field coverage, not exhaustive).

Formatting: dates via the existing `formatUTCDate` frontend utility (never raw `Date` parsing, per governance 3.8); status/category ids resolved to display names using the same lookups the existing admin report (`changeLogQueries.ts`) already performs.

Defensive behavior: if a resolved id has no matching name, fall back to the raw id. If `oldValues`/`newValues` is unexpectedly null on a non-Created entry, render "No detail available" rather than throwing.

### Time-off: field map and integration

No backend changes. `changeLogOldValues`/`changeLogNewValues` are already present on `TimeOffChangeLogDTO` and sent to the frontend today (`src/services/timeoff/changelog/index.ts`).

| DB column | Label |
|---|---|
| `tto_stadat` | Start Date |
| `tto_enddat` | End Date |
| `sta_id` | Status |
| `tot_id` | Category |
| `tto_days` | Days |
| `tto_active` | Active |

Integration points (replace the current plain-comment rendering with `ChangeLogDiff`):
- `client/src/pages/timeoff/supervisor/components/TimeOffDetailPanel.tsx`
- `client/src/pages/timeoff/detail/index.tsx`
- `client/src/pages/timeoff/exception/detail/index.tsx`

### Holiday swaps: field map, backend, and integration

**Field map** (from the full `holidaySwap` row snapshot already stored in `aud_audits`):

| Field | Label |
|---|---|
| `holidayId` (resolved via included `holiday`) | Holiday |
| `originalDate` | Holiday Date |
| `replacementDate` | Replacement Date |
| `statusId` (resolved via included `status`) | Status |

`active` and `teamMemberId` are excluded from the diff line list — `active` drives the action badge instead, and team member is already the page's context.

**Backend additions common to both flows:**
- `src/services/audit/repository.ts`: add `getByEntity(entityName: string, entityId: string): Promise<Audit[]>` — `prisma.audit.findMany({ where: { entityName, entityId }, orderBy: { createdAt: 'desc' } })`, using the existing `idx_aud_entity_search` index. No schema change.
- `src/services/audit/AuditOrchestrator.ts`: add `getHistory(entityName: string, entityId: string)` wrapping the repository call.
- `AuditHistoryEntryDTO { id: string, createdAt: string, createdBy: string, comment: string | null, oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null }` — `createdBy` resolved to a display name the same way `getTimeOffChangeLog` resolves `createdByUser.userName` today (here, `createdBy` on `Audit` is already a string identifier, e.g. email — resolve to a friendly name only if an existing lookup helper makes that trivial; otherwise display as-is). Old/new values pass through as raw JSON; diffing happens client-side via `ChangeLogDiff` and the field map above, consistent with how time-off already works.
- Errors: swap not found → `AppError('Holiday swap not found', 404)`; unauthorized → `AppError('Access denied', 403)`. New code written for this feature uses real `AppError` subclasses (per governance 13) even though the existing sibling routes in `holidaySwap.routes.ts` use an older plain-`Error`-with-`.statusCode` pattern — that existing pattern is a known violation and is not being auto-migrated.

**TM/supervisor flow:**
- New route `GET /api/holiday-swaps/:id/history` in `src/routes/holidaySwap.routes.ts`, alongside the existing `GET /:id` route. Gated by `requirePermission('HolidaySwaps', 'read')`, with the same identity-based scoping as `getSwapDetail` (caller is the swap's own team member, or a supervisor whose `getReports(...)` includes the swap's team member). Calls `auditOrchestrator.getHistory('hsw_holiday_swap', String(id))`. Returns `{ data: AuditHistoryEntryDTO[] }` per governance 12.
- Frontend: a new "History" section using `ChangeLogDiff`, added to `client/src/pages/holiday-swaps/detail/index.tsx` (the existing shared TM/supervisor detail page), inserted as a new full-width card after the existing details/status grid.

**BSA exception flow (new page — see "Scope discovery" above):**
- New backend route `GET /api/holiday-swaps/exception/:id` in `src/routes/holidaySwapException.routes.ts` — a single-swap-detail read, gated by `requirePermission('HolidaySwapException', 'read')`, returning the swap's full detail (mirroring `HolidaySwapDetailDTO` but without the employee/supervisor role computation, since the caller is BSA acting on behalf of someone else).
- New backend route `GET /api/holiday-swaps/exception/:id/history` in the same file, same permission gate, calling `auditOrchestrator.getHistory('hsw_holiday_swap', String(id))` — same underlying data source as the TM/supervisor history route, just gated by the exception-flow permission module.
- New frontend page `client/src/pages/holiday-swaps/exception/detail/index.tsx`, mirroring the structure of `client/src/pages/holiday-swaps/detail/index.tsx` (details card, status card, actions card with edit/cancel/review, new History card using `ChangeLogDiff`).
- New hook `client/src/pages/holiday-swaps/exception/hooks/useExceptionHolidaySwapDetail.ts`, mirroring `useHolidaySwapDetail.ts`, calling the two new exception routes above and threading `onBehalfOfUserId` through to the existing mutation endpoints (`update`/`cancel`/`review`) exactly as `useExceptionSwapOperations.ts` does today.
- `client/src/pages/holiday-swaps/exception/index.tsx` / `ExceptionSwapList.tsx` updated so each swap row navigates to the new detail page instead of opening `ExceptionSwapForm`/`CancelSwapDialog`/`ReviewOverrideDialog` inline; those components (or their logic) move into the new detail page. The list itself keeps its existing list/summary rendering.
- New route registered in the app's router config (the file the earlier research referred to as `app-routing-setup.tsx` — confirm exact filename during planning) for the new detail page path (e.g. `/holiday-swaps/exception/:teamMemberId/:swapId`, threading both ids since the exception flow is scoped per team member).

Explicitly **not** added to `my-profile`/`my-team` profile holiday-swap sections.

## Error handling summary

- Malformed/null snapshot on a non-Created entry → "No detail available", never a crash.
- Unresolvable status/category/holiday id → fall back to raw id.
- Empty history for a swap → route returns `{ data: [] }`; panel renders "No history" rather than erroring.
- Route-level errors follow governance 13 (`AppError` subclasses, no hardcoded status codes from message inspection).

## Testing approach

- Unit tests for `ChangeLogDiff`'s diff-computation and badge-derivation logic (Created/Updated/Cancelled/Approved/Rejected, given various old/new shapes).
- Unit tests for `AuditOrchestrator.getHistory` / repository `getByEntity` (correct filtering by entityName+entityId, correct ordering).
- Route-level tests for `GET /api/holiday-swaps/:id/history` and `GET /api/holiday-swaps/exception/:id`, `GET /api/holiday-swaps/exception/:id/history` (happy path, not-found, unauthorized). No route-level test convention exists yet in this repo (no `supertest`, no route-level mocking anywhere) — the plan will test the underlying orchestrator/query functions directly (the pattern already used by `calculateDays.test.ts`) rather than introducing new route-testing infrastructure as a side effect of this feature.
- No backend test changes needed for time-off (no backend logic changed there).
- Manual verification: exercise real time-off update/cancel and holiday-swap create/update/cancel/approve/reject flows (including the new BSA-exception detail page's own edit/cancel/review actions, migrated from the list) in the running app, confirming correct diff rendering for each action type and confirming the migrated actions still work identically to their current inline-dialog behavior.

## Open items handed to implementation planning

- Exact resolution strategy for `status`/`category`/`holiday` display names in the shared component (reuse existing lookup helpers rather than duplicating logic — to be confirmed against current code during planning).
- Confirm whether `tto_days` is a real column on `tbl_tms_time_off` or a computed value, before including it in the time-off field map.
- Exact filename/pattern of the app's router config file for registering the new exception detail page route.
- Exact URL/param shape for the new exception detail page (team member id + swap id vs. swap id alone) — needs to support returning to the correct filtered list view.
- Whether `Audit.createdBy` (a raw string, e.g. email) needs a display-name lookup for the history panel, or is acceptable to show as-is — confirm against how other parts of the app already display `createdBy`-style identifiers.

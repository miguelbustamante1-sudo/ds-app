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
- No history UI on employee-facing swap views (`my-profile`, `my-team` profile sections) — supervisor and BSA-exception detail views only.
- No changes to the generic audit log system's write path, or to how time-off's changelog is written.

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

**Backend additions:**
- `src/services/audit/repository.ts`: add `getByEntity(entityName: string, entityId: string): Promise<Audit[]>` — `prisma.audit.findMany({ where: { entityName, entityId }, orderBy: { createdAt: 'desc' } })`, using the existing `idx_aud_entity_search` index. No schema change.
- `src/services/audit/AuditOrchestrator.ts`: add `getHistory(entityName: string, entityId: string)` wrapping the repository call.
- New route: `GET /api/holiday-swaps/:id/history`, added alongside the existing holiday-swap detail routes. Calls `auditOrchestrator.getHistory('hsw_holiday_swap', String(id))`. Returns `{ data: AuditHistoryEntryDTO[] }` per governance 12 (new-route envelope convention).
- `AuditHistoryEntryDTO { id: string, createdAt: string, createdBy: string, comment: string | null, oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null }` — `createdBy` resolved to the username the same way `getTimeOffChangeLog` resolves `createdByUser.userName` today. Old/new values pass through as raw JSON; diffing happens client-side via `ChangeLogDiff` and the field map above, consistent with how time-off already works.
- Permissions: the route reuses the same access check as the existing swap-detail route it's nested under (whoever can view the swap detail can view its history). No new `PermissionAction` needed — this is a `read`.
- Errors: swap not found → `AppError('Holiday swap not found', 404)`; unauthorized → reuse the existing `AppError` from the detail route.

**Frontend integration:** a new "History" section using `ChangeLogDiff`, added only to:
- the supervisor holiday-swap detail view
- the BSA exception (`BsaHolidaySwapOrchestrator`-backed) exception detail view

Explicitly **not** added to `my-profile`/`my-team` profile holiday-swap sections.

## Error handling summary

- Malformed/null snapshot on a non-Created entry → "No detail available", never a crash.
- Unresolvable status/category/holiday id → fall back to raw id.
- Empty history for a swap → route returns `{ data: [] }`; panel renders "No history" rather than erroring.
- Route-level errors follow governance 13 (`AppError` subclasses, no hardcoded status codes from message inspection).

## Testing approach

- Unit tests for `ChangeLogDiff`'s diff-computation and badge-derivation logic (Created/Updated/Cancelled/Approved/Rejected, given various old/new shapes).
- Unit tests for `AuditOrchestrator.getHistory` / repository `getByEntity` (correct filtering by entityName+entityId, correct ordering).
- Route-level tests for `GET /api/holiday-swaps/:id/history` (happy path, not-found, unauthorized).
- No backend test changes needed for time-off (no backend logic changed there).
- Manual verification: exercise real time-off update/cancel and holiday-swap create/update/cancel/approve/reject flows (including BSA-exception flows) in the running app, confirming correct diff rendering for each action type.

## Open items handed to implementation planning

- Exact resolution strategy for `status`/`category`/`holiday` display names in the shared component (reuse existing lookup helpers rather than duplicating logic — to be confirmed against current code during planning).
- Confirm whether `tto_days` is a real column on `tbl_tms_time_off` or a computed value, before including it in the time-off field map.

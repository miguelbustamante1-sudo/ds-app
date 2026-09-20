# Changelog Visibility (Time-Off + Holiday Swaps) — Master Orchestrator

## Objective

Give reviewers real visibility into what changed on a time-off request or holiday swap, not just a comment. Time-off's changelog cards get a field-level diff (old → new) with an action badge, sourced from data already captured today. Holiday swaps get an entirely new change-history capability: a read path over the existing `aud_audits` table for the existing TM/supervisor detail page, and — since the BSA "acting as" exception flow has no detail page at all today — a brand-new exception detail page that also picks up the migrated inline edit/cancel/review actions.

Full design context: `docs/superpowers/specs/2026-09-20-changelog-visibility-design.md`.

## Plan Registry

| Plan | Scope | Status |
|---|---|---|
| [PLAN-01](./PLAN-01-timeoff-diff-ui.md) | Shared diff-computation utilities + `ChangeLogDiff` component + wire into all 3 time-off detail pages. Frontend only. | `[x] DONE — 2026-09-20` |
| [PLAN-02](./PLAN-02-swap-history-tm-supervisor.md) | Audit read path (`AuditOrchestrator.getHistory`), `GET /api/holiday-swaps/:id/history`, wire `ChangeLogDiff` into the existing shared TM/supervisor swap detail page. | `[x] DONE — 2026-09-20` |
| [PLAN-03](./PLAN-03-exception-backend.md) | New backend routes for the BSA exception flow: single-swap detail + history, both gated by the `HolidaySwapException` permission. | `[x] DONE — 2026-09-20` |
| [PLAN-04](./PLAN-04-exception-frontend.md) | New BSA exception detail page (mirrors the TM/supervisor page), migrates the exception list's inline edit/cancel/review dialogs into it, adds the History section, updates routing. | `[x] DONE — 2026-09-20` |

## Execution Order

PLAN-01 has no dependency on the others and can run first or in parallel with PLAN-02/03.

```
PLAN-01 (time-off, frontend-only) ──────────────┐
                                                  │
PLAN-02 (TM/supervisor swap history) ───────────┤──> all four independently shippable
                                                  │
PLAN-03 (exception backend) ──> PLAN-04 (exception frontend, depends on PLAN-03's routes)
```

PLAN-04 depends on PLAN-03 (it calls the routes PLAN-03 creates). PLAN-01 and PLAN-02 both produce the shared `ChangeLogDiff` component's first two consumers — PLAN-02 reuses the component PLAN-01 builds, so **PLAN-01 must be completed (or at minimum its Task 1–4, the component itself) before PLAN-02's Task 4**. PLAN-04 reuses `ChangeLogDiff` too, so it also depends on PLAN-01 being complete.

Recommended order: **PLAN-01 → PLAN-02 → PLAN-03 → PLAN-04.**

## Cross-Cutting Constraints

- No DB schema changes anywhere in this feature — everything reads data already being captured (`TimeOffChangeLog.changeLogOldValues/NewValues`, `Audit.oldValues/newValues`).
- New backend code throws real `AppError` subclasses (governance 13) even though sibling routes in `holidaySwap.routes.ts` use an older plain-`Error`-with-`.statusCode` pattern — don't copy that pattern, and don't auto-migrate the existing sibling routes to fix it either.
- New routes wrap responses in `{ data: T }` (governance 12). Do not touch the existing legacy `GET /api/holiday-swaps/:id` route's response shape.
- Frontend never uses `new Date(rawDate)` — always `formatUTCDate`/`parseUTCDateAsLocal` from `client/src/lib/utils.ts`.
- No new `PermissionAction` values — everything here is a `read`.
- `camelCase` everywhere in new TypeScript; raw DB column names (`tto_stadat`, `sta_id`, etc.) only ever appear as JSON object keys being read out of `oldValues`/`newValues`, never as TypeScript identifiers.
- Every task's tests run with `npx vitest run <path>` from the repo root (backend) or `client/` (frontend) — confirm the working directory in each step before running.

## How to Mark Plans Complete

Update the Status column above: `[ ] IN PROGRESS` while a plan is actively being worked, `[x] DONE — YYYY-MM-DD` once all of its tasks are checked off and its tests pass.

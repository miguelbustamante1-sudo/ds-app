# Team Member and Hierarchy Rules

## Canonical Hierarchy Rule
Never query the reporting hierarchy directly from feature routes or arbitrary services.

Hierarchy traversal belongs to this service. The canonical traversal function is:

`getReports(supervisorId, includeFullHierarchy)`

## Wrapper Rule
Each consuming feature must have its own dedicated wrapper query inside:

`src/services/teamMember/queries/`

That wrapper must:
1. call `getReports(...)`
2. apply feature-specific filtering in TypeScript
3. return a purpose-built DTO for that feature

## Why
This keeps:
- hierarchy depth logic centralized
- recursive CTE logic centralized
- downstream consumers consistent
- page-specific DTO shapes focused

## Consumer Rule
Routes and frontend code should consume the dedicated wrapper for the feature.
They should not call `getReports()` directly.

## Existing Wrappers

| Function | Location | Purpose |
|---|---|---|
| `getReportsForActivityLog` | `queries/getReportsForActivityLog.ts` | Time-off activity log view |
| `getReportsForPendingRequests` | `queries/getReportsForPendingRequests.ts` | Supervisor pending requests panel |
| `getReportsForCountdownNotification` | via `getSupervisorsForCountdownNotification` | Countdown notification dispatch |
| `getReportsForDashboardTasks` | `queries/getReportsForDashboardTasks.ts` | Dashboard "Awaiting Your Action" panel (direct reports only) |
| `getReportsForDashboardFlags` | `queries/getReportsForDashboardFlags.ts` | Dashboard "Weekly Flags" panel (direct reports only) |
| `getReportsForTimeOffHubSummary` | `queries/getReportsForTimeOffHubSummary.ts` | Time Off Hub summary cards + drill-down page |

When adding a new feature that needs the reporting hierarchy, create a new wrapper in `src/services/teamMember/queries/` — do not reuse an existing wrapper from a different feature.

## Migration Rule
If you find old scattered hierarchy implementations, replace them with wrapper-based usage around the canonical `getReports()` function.
Do not add new consumers of legacy hierarchy queries.

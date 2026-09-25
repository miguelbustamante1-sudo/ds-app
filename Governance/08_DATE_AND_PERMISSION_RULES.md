# Date and Permission Rules

## Frontend Date Rule
Dates are stored at UTC midnight. Directly passing a UTC date string into JavaScript `new Date(...)` can shift the visible date backward in local timezones behind UTC.

Do not parse date-only values with raw `new Date(record.startDate)` when the field is stored as UTC midnight.

## Required Date Utilities
Use the existing frontend utilities from:

`client/src/lib/utils.ts`

Use:
- `parseUTCDateAsLocal`
- `formatUTCDate`

These utilities preserve the intended calendar day.

## Display Date Format
All user-facing dates must display in `dd-MMM-yyyy` format (e.g. `20-Mar-2026`).

This is the default format in `formatUTCDate`. Do not override it with a different format string unless there is an explicit technical reason (e.g. an input field that requires ISO format).

## Why
A value such as `2025-06-15T00:00:00.000Z` can appear as the previous date in timezones behind UTC if handled incorrectly.

## Permission Actions
The valid permission actions are:
- `read`
- `create`
- `delete`

## Important Permission Rule
Use `create` for both:
- create operations
- update operations

Use:
- `read` for GET and view access
- `create` for POST, PUT, and PATCH style mutations
- `delete` for deletions

## Examples
- viewing a list: `read`
- creating a record: `create`
- updating a record: `create`
- deleting a record: `delete`

---

## Frontend 403 Handling (Access Denied)

Every backend 403 (authenticated but not authorized — see `Governance/13_ERROR_HANDLING.md`) must produce the same user-facing behavior everywhere in the app: **a toast plus a redirect to the dashboard.** No page should be left showing a broken/half-loaded state, and no page should implement its own 403 handling.

**Where it's implemented:**
- `client/src/lib/api.ts` — `handleResponse` dispatches a `window` event, `auth:forbidden`, whenever any `apiGet`/`apiPost`/`apiPut`/`apiPatch`/`apiDelete` call receives a 403. This mirrors the existing `auth:unauthorized` (401) event.
- `client/src/auth/auth-provider.tsx` — `AuthProvider` listens for `auth:forbidden` (it already sits inside `BrowserRouter`, so it has router + toast access) and, on receipt: shows a `destructive` toast ("Access denied" / "You don't have permission to do that.") via `toast` from `@/hooks/use-toast`, then `navigate('/')` (the dashboard route).

**Rule:** Do not add a page-level 403 branch (custom error UI, inline "not allowed" message, manual redirect) for a route already covered by `api.ts`. The global handler covers every `api*` call automatically. Only add page-specific handling if a flow genuinely needs different UX than "toast + dashboard redirect" — and if so, stop and confirm with the user first, since this is meant to be a single consistent behavior app-wide.

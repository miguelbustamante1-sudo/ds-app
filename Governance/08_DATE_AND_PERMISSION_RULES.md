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

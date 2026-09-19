# Audit Logging Rules

## Mandatory Rule
Every service action that performs a database mutation must register an audit record.

This includes every:
- CREATE
- UPDATE
- DELETE

If a mutation exists without audit logging, add it.

## Schema Exemption
Tables in the PostgreSQL `es` schema are **exempt** from audit logging unless explicitly directed to add it.
All other schemas (`ds`, `public`, etc.) require audit logging without exception.

## Database-Native Workflow Instantiation Exemption
A `DATABASE`-execution-type workflow template's instantiate procedure (`wfl_instantiate_proc_name`) is exempt
from calling `auditOrchestrator.log(...)` for its own domain mutation, because no TypeScript code runs at all
on that call path when triggered DB-natively (see `documents/superpowers/specs/2026-09-18-workflow-database-native-execution-type-design.md`
§3.4). Instead, the procedure must insert directly into the audit table, matching `auditOrchestrator.log`'s
required fields column-for-column: `entityName` (the `@@map` table name), `entityId`, `createdBy`, `oldValues`,
`newValues`, `comment`.

This exemption is scoped **only** to the instantiate procedure's own domain mutation — the shared engine
primitives (`sp_engine_create_instance`, `sp_engine_insert_task`, `sp_engine_complete_instance_if_done`) write
to `wal_workflow_audit_log` (the workflow-specific trail), which was never routed through `auditOrchestrator`
in the first place and needs no exception. A `DATABASE`-type outcome's procedure (triggered via
`TaskCompletionOrchestrator`, where TypeScript is always present) is likewise not exempt — its audit logging
runs through `auditOrchestrator.log(...)` in the normal post-commit callback shape, same as any `CODE`-type
outcome handler.

## Required Service
Use:

`auditOrchestrator.log(...)`

from:

`src/services/audit/AuditOrchestrator.ts`

## Required Audit Fields
- `entityName`: the actual DB table name — use the `@@map("...")` value from the Prisma schema, not the Prisma model name. Example: `pro_projects` not `Project`, `hsw_holiday_swap` not `HolidaySwap`.
- `entityId`: affected record ID converted to string
- `createdBy`: user email or identifier, usually from `req.user.email`
- `oldValues`: full snapshot before the mutation, or `null` for create
- `newValues`: full snapshot after the mutation, or `null` for delete
- `comment`: concise human-readable description

## Operation Rules

### CREATE
- `oldValues` must be `null`
- `newValues` must contain the inserted record
- `entityId` must use the inserted record ID

### UPDATE
- `oldValues` must contain the record before change
- `newValues` must contain the record after change

### DELETE
- `oldValues` must contain the record before deletion
- `newValues` must be `null`

## Comment Rule
Comments must be concise and human-readable.

Examples:
- `Endorsement status updated to Approved`
- `Time-off request created for employee john@example.com`
- `Project assignment deleted`

## Practical Rule
When updating or deleting, fetch the existing record first so audit logging captures the pre-change state.

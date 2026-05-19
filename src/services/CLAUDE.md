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

---

# Error Handling — Service Layer

## Services Throw, Routes Catch
Services throw `AppError` subclasses for business rule violations. They throw plain `Error` (or let Prisma errors bubble) for unexpected failures.

```ts
// Good — business rule violation
const record = await prisma.thing.findUnique({ where: { id } });
if (!record) throw new ThingNotFoundError();

// Good — access rule
if (record.teamMemberId !== requestingMemberId) {
  throw new AppError('Access denied', 403);
}

// Good — let unexpected DB errors bubble as-is (route will catch as 500)
const created = await prisma.thing.create({ data });
```

Do not wrap every Prisma call in try/catch inside the service. Let infrastructure errors propagate naturally to the route's catch block where they become 500s.

## Violation Policy
If you encounter existing code that uses plain `throw new Error` or result objects:
- **Do not refactor it automatically.**
- Identify it and propose the migration to the user before touching it.
- For any **new** code you write, always extend `AppError`.

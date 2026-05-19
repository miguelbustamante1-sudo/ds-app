# DTO Conventions

## This Folder's Purpose
This is the API contract layer. Every interface here describes data flowing over the wire between backend and frontend. Both sides must import from `@shared/dto` — never redefine locally.

## What Belongs Here
- Interfaces for API request bodies and response shapes
- Enums used in those interfaces
- Union types the frontend needs to narrow

## What Does NOT Belong Here
- Prisma types or `@prisma/client` imports
- Server-only modules (Express, `fs`, etc.)
- Business logic or computed values
- Raw DB column names (snake_case)

---

## Standard Naming Pattern

| Interface | Purpose |
|---|---|
| `EntityDTO` | Full record returned by GET |
| `CreateEntityDTO` | Request body for POST |
| `UpdateEntityDTO` | Request body for PUT / PATCH |

Action-specific mutations get purpose-named DTOs instead of overloading Update:
- `ReviewHolidaySwapDTO`, `CancelMyTimeOffDTO`, `UpdateEndorsementStatusDTO`

---

## Create DTO Rules
- Omit the primary key (auto-generated)
- Omit audit fields (`createdBy`, `createdAt`, `updatedBy`, `updatedAt`) — server populates from `req.user`
- Required fields are non-optional; truly optional fields use `?`

## Update DTO Rules
- All fields are `?` to support partial updates
- Omit the primary key (comes from URL param)
- Omit audit fields
- Omit structurally immutable fields and document why

## Read DTO Rules
- Field names mirror Prisma schema exactly (`camelCase`)
- Optional joined fields for display go at the bottom, typed `?: string | null`
- Dates in response DTOs: use `string` (ISO). In input DTOs: `Date | string` is acceptable.

---

## Extended DTOs
Use `extends` — never duplicate fields:
```ts
export interface EndorsementWithDetailsDTO extends EndorsementDTO {
  project: { projectName: string | null };
}
```

For lightweight list views, define a `SummaryDTO` with fewer fields.

---

## Dynamic Shapes
Use `Record<string, unknown>` for untyped payloads. Never `any`.

---

## Discriminated Unions
Use a `type` discriminant when an endpoint returns heterogeneous records:
```ts
export type PendingRequest = PendingTimeOffRequest | PendingHolidaySwapRequest;
```

---

## index.ts
Every new file must be re-exported from `index.ts`. Consumers import from `@shared/dto`, never from individual files.

---

## Known Legacy Violations
`Client.ts` and `FunctionalArea.ts` use `Id`/`Name` (PascalCase) instead of `clientId`/`functionalAreaId`. Do not follow this pattern. Do not refactor automatically — propose first.

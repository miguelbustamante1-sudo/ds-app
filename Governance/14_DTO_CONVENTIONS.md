# DTO Conventions

## What Belongs in `shared/dto`

This folder holds the **API contract layer** — TypeScript interfaces that describe data flowing between the backend and the frontend. Nothing else belongs here.

**Do put here:**
- Interfaces describing API request bodies and response shapes
- Enums used in those interfaces (e.g. `PersistenceJobStatus`, `ErrorHandlingStrategy`)
- Union types that the frontend needs to narrow (e.g. `PendingRequest`)

**Do NOT put here:**
- Prisma types or any `@prisma/client` imports
- Server-only modules (Express, `fs`, etc.)
- Business logic or computed values
- Database column names (raw snake_case) — those belong in the service layer

---

## File Organization

One file per domain entity. The file is named after the entity in PascalCase.

```
shared/dto/
├── Country.ts
├── Holiday.ts
├── HolidaySwap.ts
├── TeamMember.ts
├── TimeOff.ts
├── ...
└── index.ts        ← re-exports everything
```

Every new file must be added to `index.ts`.

---

## Standard Naming Pattern

For a typical CRUD entity, define three interfaces:

| Interface | Purpose |
|---|---|
| `EntityDTO` | Full record returned by GET endpoints |
| `CreateEntityDTO` | Request body for POST |
| `UpdateEntityDTO` | Request body for PUT / PATCH |

Example:
```ts
export interface CountryDTO {
  countryId: number;
  countryName: string;
  regionId: number | null;
  countryIso: string | null;
}

export interface CreateCountryDTO {
  countryName: string;
  regionId: number | null;
  countryIso?: string | null;
}

export interface UpdateCountryDTO {
  countryName?: string;
  regionId?: number | null;
  countryIso?: string | null;
}
```

---

## Read DTO Rules (`EntityDTO`)

- Field names must mirror Prisma schema field names exactly (`camelCase`).
- Include all fields the API returns, including audit trail fields (`createdBy`, `createdAt`, `updatedBy`, `updatedAt`) — they are read-only but the frontend may need to display them.
- Optional joined fields for display (e.g. `countryName` resolved from a relation join) go at the bottom of the interface, typed as `?: string | null`.

```ts
export interface TeamMemberDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  // ... core Prisma fields ...

  // Optional joined fields for display — not always present
  countryName?: string | null;
  roleName?: string | null;
}
```

---

## Create DTO Rules (`CreateEntityDTO`)

- **Omit** the primary key — it is auto-generated.
- **Omit** audit fields (`createdBy`, `createdAt`, `updatedBy`, `updatedAt`) — the server populates them from `req.user`.
- **Omit** server-computed fields (e.g. derived totals, resolved relations).
- Required fields are **non-optional**.
- Truly optional fields use `?`.

```ts
export interface CreateCountryDTO {
  countryName: string;        // required
  regionId: number | null;    // required, nullable
  countryIso?: string | null; // optional
}
```

---

## Update DTO Rules (`UpdateEntityDTO`)

- All fields are **optional** (`?`) to support partial updates.
- **Omit** the primary key — it comes from the URL param, not the body.
- **Omit** audit fields — server populates them.
- **Omit** fields that are structurally immutable after creation (e.g. `teamMemberId` on an assignment cannot be changed after creation — omit it from the Update DTO and document the reason).

```ts
export interface UpdateCountryDTO {
  countryName?: string;
  regionId?: number | null;
  countryIso?: string | null;
}
```

---

## Date Field Type Convention

- In **response DTOs** (`EntityDTO`, `EntityDetailDTO`): use `string` for date fields. The API serializes them as ISO strings. Avoid `Date | string` on read DTOs — the frontend will always receive a string.
- In **input DTOs** (`CreateEntityDTO`, `UpdateEntityDTO`): `Date | string` is acceptable to give callers flexibility. The service layer is responsible for parsing.

```ts
// Response DTO — always string over the wire
export interface HolidayDTO {
  holidayDate: string;          // ISO date string
  holidayCreatedAt: string | null;
}

// Input DTO — flexible
export interface CreateHolidayDTO {
  holidayDate: Date | string;
}
```

---

## Extended and Variant DTOs

When a read DTO needs more data than the base, use `extends` — never duplicate fields.

```ts
// Base
export interface EndorsementDTO { ... }

// Extended for detail view (adds nested relations)
export interface EndorsementWithDetailsDTO extends EndorsementDTO {
  project: { projectName: string | null; clientId: number | null };
  country: { countryName: string; countryCurrencySymbol: string | null };
}
```

When a list view needs fewer fields than the full DTO, define a `SummaryDTO`:

```ts
export interface ReportDefinitionSummaryDTO {
  reportId: number;
  reportName: string;
  reportDescription: string | null;
  reportGroup: string;
  reportActive: boolean;
}
```

---

## Action-Specific DTOs

Not all operations are CRUD. For non-standard mutations (status transitions, cancellations, reviews), define a purpose-named DTO:

```ts
export interface ReviewHolidaySwapDTO {
  statusId: number;
  comment?: string;
}

export interface CancelMyTimeOffDTO {
  comment: string;
}

export interface UpdateEndorsementStatusDTO {
  status: string;
  comment?: string | null;
}
```

These are preferable over overloading `UpdateEntityDTO` with optional fields that only apply to one workflow.

---

## Discriminated Unions

When an endpoint returns heterogeneous records, use a discriminated union with a `type` field so the frontend can narrow safely:

```ts
export type PendingRequestType = 'TimeOff' | 'HolidaySwap';

interface BasePendingRequest {
  type: PendingRequestType;
  entityId: number;
  teamMemberId: number;
  // ...
}

export interface PendingTimeOffRequest extends BasePendingRequest {
  type: 'TimeOff';
  timeOffStartDate: string;
  timeOffDays: number;
}

export interface PendingHolidaySwapRequest extends BasePendingRequest {
  type: 'HolidaySwap';
  originalDate: string;
  replacementDate: string;
}

export type PendingRequest = PendingTimeOffRequest | PendingHolidaySwapRequest;
```

---

## Dynamic Shape Fields

Use `Record<string, unknown>` for payloads or metadata whose structure is not known at compile time. Never use `any`.

```ts
export interface CreateNotificationDTO {
  payload: Record<string, unknown>;
}
```

---

## The `index.ts` Barrel

Every new DTO file must be re-exported from `shared/dto/index.ts`. Consumers always import from `@shared/dto`, never from individual files directly.

```ts
// Correct
import { CountryDTO, CreateCountryDTO } from '@shared/dto';

// Wrong
import { CountryDTO } from '@shared/dto/Country';
```

Group new exports logically with a comment that matches the existing structure.

---

## Known Legacy Violations

These files predate the camelCase convention and use PascalCase field names. Do not follow their pattern for new DTOs, and do not refactor them automatically — propose the migration first.

| File | Violation |
|---|---|
| `Client.ts` | `Id`, `Name` should be `clientId`, `clientName` |
| `FunctionalArea.ts` | `Id`, `Name` should be `functionalAreaId`, `functionalAreaName` |

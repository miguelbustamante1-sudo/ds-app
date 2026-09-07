# Holiday Swaps — Backend Domain

## What Is a Holiday Swap?
A holiday swap is an agreement where a team member chooses to **work on an official public holiday** in exchange for receiving a **replacement day off** at a future date of their choosing.

- The **original holiday date** becomes a regular working day for that team member while the swap is active.
- The **replacement date** becomes a personal holiday for that team member and must be treated as such everywhere in the application.

## Statuses

| Status | DB Name | Meaning |
|---|---|---|
| Tentative | `Tentative` | Submitted, awaiting supervisor review |
| Acknowledged | `Acknowledged` | Approved by supervisor — swap is now active |
| Taken | `Taken` | Holiday date has passed and the swap was used |
| Cancelled | `Cancelled` | Cancelled by the team member or supervisor |
| Rejected | `Rejected` | Rejected by supervisor |

A swap is **active** when its status is `Acknowledged` and the original holiday date has not yet passed. Only active swaps affect day calculation and time-off validation.

## Domain Structure

```
src/services/holidaySwap/
├── HolidaySwapOrchestrator.ts        ← main entry point for all operations
├── components/
│   ├── LoadStatusIds.ts              ← resolves all swap status IDs from DB
│   ├── ValidateSwapEligibility.ts    ← country match, future date, no duplicate, no overlapping time-off
│   ├── ValidateReplacementDay.ts     ← future, after original, not weekend, not holiday, not already used
│   ├── ValidateCancellation.ts       ← original date still future, no conflicting time-offs
│   ├── NotifySwapSubmitted.ts
│   ├── NotifySwapReviewed.ts
│   └── NotifySwapCancelled.ts
└── queries/
    ├── getMySwaps.ts                 ← TM's own swaps
    └── getActiveSwapsForTM.ts        ← Acknowledged + active swaps (used by day calc and validation)
```

Routes file: `src/routes/holidaySwap.routes.ts`
Shared DTO: `shared/dto/HolidaySwap.ts`

## How the Replacement Date Affects the Rest of the App

### 1. Day Calculation
**File:** `src/services/timeoff/dayCalculation/components/LoadHolidaysForCalc.ts`

When calculating how many working days a time-off request covers:
- The **original holiday date is removed** from the holidays list → counts as a working day.
- The **replacement date is added** as a virtual holiday → does not count as a working day.

### 2. Time-Off Validation
**File:** `src/services/timeoff/validation/rules/holidaySwap.rule.ts`

- `validateSwappedHolidayNotInRange` — blocks a time-off request whose date range includes the **original holiday date**.
- `validateReplacementDayNotInRange` — blocks a time-off request whose date range includes the **replacement date**.

## API Routes Reference

| Method | Path | Actor | Purpose |
|---|---|---|---|
| `GET` | `/api/holiday-swaps/my` | TM | List own swaps |
| `POST` | `/api/holiday-swaps/my` | TM | Submit a new swap |
| `PATCH` | `/api/holiday-swaps/my/:id/cancel` | TM | Cancel own swap |
| `GET` | `/api/holiday-swaps/my/active-swaps` | TM | Active swaps (used by time-off context) |
| `GET` | `/api/holiday-swaps/team/:teamMemberId` | Supervisor | View TM's swaps |
| `POST` | `/api/holiday-swaps/team/:teamMemberId` | Supervisor | Create swap on behalf of TM |
| `PATCH` | `/api/holiday-swaps/team/:id` | Supervisor | Edit an existing swap |
| `PATCH` | `/api/holiday-swaps/team/:id/cancel` | Supervisor | Cancel a TM's swap |
| `PATCH` | `/api/holiday-swaps/:id/review` | Supervisor | Approve or reject (Tentative only) |
| `GET` | `/api/holiday-swaps/:id` | TM / Supervisor | Single swap detail with available actions |

## Edit and Cancel Rules (Supervisor)

| Status | Can Edit? | Can Cancel? |
|---|---|---|
| Tentative | Yes | Yes |
| Acknowledged | Yes | Yes |
| Taken | No | No |
| Cancelled | No | No |
| Rejected | No | No |

Editing a swap resets it back to **Tentative** so the supervisor must re-approve it.

## Key Invariants

1. **Replacement date uniqueness** — a given replacement date can only be used by one active swap per team member.
2. **Future original date** — the original holiday date must still be in the future at the time of creation or review.
3. **No overlapping time-offs** — neither the original date nor the replacement date may overlap with an existing active time-off request.
4. **Day calculation must always call `loadHolidaysForCalc`** — do not bypass it with raw holiday lookups, or swap substitutions will be silently ignored.
5. **Active swaps = Acknowledged + original date in future** — any feature that needs to know a TM's effective holidays must query `getActiveSwapsForTM`.

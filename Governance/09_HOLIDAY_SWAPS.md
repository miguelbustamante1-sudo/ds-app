# Holiday Swaps

## What Is a Holiday Swap?

A holiday swap is an agreement where a team member chooses to **work on an official public holiday** in exchange for receiving a **replacement day off** at a future date of their choosing.

- The **original holiday date** becomes a regular working day for that team member while the swap is active.
- The **replacement date** becomes a personal holiday for that team member and must be treated as such everywhere in the application.

This means the team member effectively moves their day off from the official holiday to their chosen replacement date.

---

## Statuses

| Status | DB Name | Meaning |
|---|---|---|
| Tentative | `Tentative` | Submitted, awaiting supervisor review |
| Acknowledged | `Acknowledged` | Approved by supervisor — swap is now active |
| Taken | `Taken` | Holiday date has passed and the swap was used |
| Cancelled | `Cancelled` | Cancelled by the team member or supervisor |
| Rejected | `Rejected` | Rejected by supervisor |

A swap is considered **active** when its status is `Acknowledged` (approved) and the original holiday date has not yet passed. Only active swaps affect day calculation and time-off validation.

Split (`statusId: 6`) is exclusive to supervisor time-off and does not apply to holiday swaps.

---

## Three Creation Paths

### 1. Team Member Self-Service
**Page:** `/holiday-swaps`
**Files:** `client/src/pages/holiday-swaps/`
**API:** `POST /api/holiday-swaps/my`

The team member picks a future country holiday and a replacement date, submits the request, and it lands in `Tentative` status for supervisor review.

### 2. Supervisor — Team Holiday Swaps Page
**Page:** `/supervisor-holiday-swaps`
**Files:** `client/src/pages/holiday-swaps/supervisor/`
**API:** `POST /api/holiday-swaps/team/:teamMemberId`

The supervisor selects a team member from the dropdown, fills the inline form, and submits on their behalf. The same form is also used for **editing** an existing swap — clicking Edit on a row pre-populates the form; the submit button becomes "Save Changes" and calls `PATCH /api/holiday-swaps/team/:swapId`.

### 3. Supervisor — Team Member Profile
**Page:** `/my-team/:id` (Holiday Swaps section)
**Files:** `client/src/pages/my-team/profile/components/HolidaySwapsSection.tsx`
**API:** `POST /api/holiday-swaps/team/:teamMemberId`

Same creation endpoint as path 2. This is a secondary entry point embedded in the team member profile card.

---

## How the Replacement Date Affects the Rest of the App

This is the most important cross-cutting concern. Once a swap is **Acknowledged**, two things change for that team member:

### 1. Day Calculation (working days deduction)
**File:** `src/services/timeoff/dayCalculation/components/LoadHolidaysForCalc.ts`

When calculating how many working days a time-off request covers:
- The **original holiday date is removed** from the holidays list → it counts as a working day.
- The **replacement date is added** as a virtual holiday → it does not count as a working day.

This function is called by `calculateTimeOffDaysForTeamMember` wherever workday counting happens.

### 2. Time-Off Validation (overlap rules)
**File:** `src/services/timeoff/validation/rules/holidaySwap.rule.ts`

Two validation rules run whenever a new time-off request is submitted:
- `validateSwappedHolidayNotInRange` — blocks a time-off request whose date range includes the **original holiday date** (the TM must work that day).
- `validateReplacementDayNotInRange` — blocks a time-off request whose date range includes the **replacement date** (it is the TM's personal holiday and cannot be spent on a time-off request).

---

## Backend Domain

All holiday swap logic lives under:

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

---

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

---

## Frontend Pages Reference

| Path | Component | Description |
|---|---|---|
| `/holiday-swaps` | `client/src/pages/holiday-swaps/index.tsx` | TM self-service list + request/cancel |
| `/holiday-swaps/:swapId` | `client/src/pages/holiday-swaps/detail/` | Swap detail with role-aware actions |
| `/supervisor-holiday-swaps` | `client/src/pages/holiday-swaps/supervisor/index.tsx` | Full supervisor management page |
| `/my-team/:id` | `client/src/pages/my-team/profile/components/HolidaySwapsSection.tsx` | Embedded section in team member profile |

---

## Edit and Cancel Rules (Supervisor)

| Status | Can Edit? | Can Cancel? |
|---|---|---|
| Tentative | Yes | Yes |
| Acknowledged | Yes | Yes |
| Taken | No | No |
| Cancelled | No | No |
| Rejected | No | No |

Editing a swap (regardless of current status) resets it back to **Tentative** so the supervisor must re-approve it. This ensures the updated dates go through the review cycle again.

---

## Key Invariants to Preserve

1. **Replacement date uniqueness** — a given replacement date can only be used by one active swap per team member.
2. **Future original date** — the original holiday date must still be in the future at the time of creation or review.
3. **No overlapping time-offs** — neither the original date nor the replacement date may overlap with an existing active time-off request.
4. **Day calculation must always call `loadHolidaysForCalc`** — do not bypass it with raw holiday lookups, or swap substitutions will be silently ignored.
5. **Active swaps = Acknowledged + original date in future** — any feature that needs to know a TM's effective holidays must query `getActiveSwapsForTM`.

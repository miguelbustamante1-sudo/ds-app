# Holiday Swaps — Frontend

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

## Frontend Pages Reference

| Path | Component | Description |
|---|---|---|
| `/holiday-swaps` | `client/src/pages/holiday-swaps/index.tsx` | TM self-service list + request/cancel |
| `/holiday-swaps/:swapId` | `client/src/pages/holiday-swaps/detail/` | Swap detail with role-aware actions |
| `/supervisor-holiday-swaps` | `client/src/pages/holiday-swaps/supervisor/index.tsx` | Full supervisor management page |
| `/my-team/:id` | `client/src/pages/my-team/profile/components/HolidaySwapsSection.tsx` | Embedded section in team member profile |

## Statuses

| Status | Meaning |
|---|---|
| Tentative | Submitted, awaiting supervisor review |
| Acknowledged | Approved by supervisor — swap is now active |
| Taken | Holiday date has passed and the swap was used |
| Cancelled | Cancelled by the team member or supervisor |
| Rejected | Rejected by supervisor |

## Edit and Cancel Rules (Supervisor)

| Status | Can Edit? | Can Cancel? |
|---|---|---|
| Tentative | Yes | Yes |
| Acknowledged | Yes | Yes |
| Taken | No | No |
| Cancelled | No | No |
| Rejected | No | No |

Editing a swap resets it back to **Tentative** so the supervisor must re-approve it.

## Key Invariant for the Frontend
The replacement date is a personal holiday for the team member. The time-off form must respect this — the backend will reject any time-off request that overlaps with either the original holiday date or the replacement date of an active swap.

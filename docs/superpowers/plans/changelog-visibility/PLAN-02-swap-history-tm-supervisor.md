# Holiday Swap History — TM/Supervisor Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read path over the existing `aud_audits` table and surface it as a "History" section (using the `ChangeLogDiff` component from PLAN-01) on the existing shared TM/supervisor holiday-swap detail page.

**Architecture:** `AuditOrchestrator` gets a new `getHistory` method backed by a new `getByEntity` repository function (no schema change — reuses the existing `idx_aud_entity_search` index). A new `GET /api/holiday-swaps/:id/history` route, gated by the same `requirePermission('HolidaySwaps', 'read')` used by the sibling detail route, returns `{ data: AuditHistoryEntryDTO[] }`. The frontend fetches this alongside the existing swap detail and renders each entry with `ChangeLogDiff`.

**Tech Stack:** Express, Prisma, Vitest, React, React Query-free `apiGet` pattern (matches `useHolidaySwapDetail`'s existing style).

**Depends on:** PLAN-01 must be complete (this plan's Task 5 imports `ChangeLogDiff`, `buildFieldDiff`'s types, and `deriveActionBadge`).

---

### Task 1: `getByEntity` on the audit repository

**Files:**
- Modify: `src/services/audit/repository.ts`
- Test: `src/services/audit/repository.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/services/audit/repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getByEntity } from './repository';
import { prisma } from '../../db/prisma';

vi.mock('../../db/prisma', () => ({
  prisma: {
    audit: {
      findMany: vi.fn(),
    },
  },
}));

describe('getByEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries by entityName/entityId ordered newest-first', async () => {
    const rows = [{ id: '1', entityName: 'hsw_holiday_swap', entityId: '42' }];
    (prisma.audit.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(rows);

    const result = await getByEntity('hsw_holiday_swap', '42');

    expect(prisma.audit.findMany).toHaveBeenCalledWith({
      where: { entityName: 'hsw_holiday_swap', entityId: '42' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toBe(rows);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from repo root): `npx vitest run src/services/audit/repository.test.ts`
Expected: FAIL — `getByEntity is not exported` / `undefined is not a function`

- [ ] **Step 3: Add the function**

Append to `src/services/audit/repository.ts` (keep the existing `CreateAuditInput`/`createAudit` exactly as-is above this addition):

```ts
import type { Audit } from '@prisma/client';

export async function getByEntity(entityName: string, entityId: string): Promise<Audit[]> {
  return prisma.audit.findMany({
    where: { entityName, entityId },
    orderBy: { createdAt: 'desc' },
  });
}
```

(Add the `import type { Audit } from '@prisma/client';` line near the file's existing `import { Prisma } from '@prisma/client';` line — combine into one import statement if preferred: `import { Prisma, type Audit } from '@prisma/client';`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/audit/repository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/audit/repository.ts src/services/audit/repository.test.ts
git commit -m "feat(audit): add getByEntity read function"
```

---

### Task 2: `getHistory` on `AuditOrchestrator`

**Files:**
- Modify: `src/services/audit/AuditOrchestrator.ts`
- Test: `src/services/audit/AuditOrchestrator.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/services/audit/AuditOrchestrator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AuditOrchestrator } from './AuditOrchestrator';
import * as repository from './repository';

describe('AuditOrchestrator.getHistory', () => {
  it('delegates to repository.getByEntity with the same arguments', async () => {
    const rows = [{ id: '1' }];
    const spy = vi.spyOn(repository, 'getByEntity').mockResolvedValue(rows as never);
    const orchestrator = new AuditOrchestrator();

    const result = await orchestrator.getHistory('hsw_holiday_swap', '42');

    expect(spy).toHaveBeenCalledWith('hsw_holiday_swap', '42');
    expect(result).toBe(rows);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/audit/AuditOrchestrator.test.ts`
Expected: FAIL — `orchestrator.getHistory is not a function`

- [ ] **Step 3: Add the method**

Modify `src/services/audit/AuditOrchestrator.ts`:

```ts
import { createAudit, getByEntity } from './repository';
import type { CreateAuditInput } from './repository';
import type { Audit } from '@prisma/client';

export class AuditOrchestrator {
  async log(input: CreateAuditInput) {
    return createAudit(input);
  }

  /** Full change history for one entity, newest first. */
  async getHistory(entityName: string, entityId: string): Promise<Audit[]> {
    return getByEntity(entityName, entityId);
  }
}

export const auditOrchestrator = new AuditOrchestrator();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/audit/AuditOrchestrator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/audit/AuditOrchestrator.ts src/services/audit/AuditOrchestrator.test.ts
git commit -m "feat(audit): add AuditOrchestrator.getHistory"
```

---

### Task 3: `GET /api/holiday-swaps/:id/history` route

**Files:**
- Modify: `src/routes/holidaySwap.routes.ts`
- Create: `shared/dto/AuditHistory.ts` (or the equivalent existing shared-DTO location — confirm exact path by running `ls shared/dto | grep -i Audit` first; if a different relative import alias is used elsewhere in `holidaySwap.routes.ts`, e.g. `@shared/dto/...`, match that alias)

- [ ] **Step 1: Confirm the shared DTO import convention**

Run: `grep -n "from '@shared/dto" src/routes/holidaySwap.routes.ts | head -3`

Use whatever alias/path style this shows (the plan assumes `@shared/dto/...` based on prior file reads — adjust if the repo shows otherwise).

- [ ] **Step 2: Create the DTO file**

```ts
// shared/dto/AuditHistory.ts
export interface AuditHistoryEntryDTO {
  id: string;
  createdAt: string;
  createdBy: string;
  comment: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}
```

- [ ] **Step 3: Add the route**

Add this import near the top of `src/routes/holidaySwap.routes.ts` (alongside the existing imports):
```ts
import { AppError } from '../errors/AppError';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';
import { getReports } from '../services/teamMember/queries/getReports';
import type { AuditHistoryEntryDTO } from '@shared/dto/AuditHistory';
```
(If `getReports` is already imported under a different name/path in this file for the existing `getSwapDetail`-adjacent code, reuse that import instead of adding a duplicate — check first with `grep -n "getReports" src/routes/holidaySwap.routes.ts src/services/holidaySwap/HolidaySwapOrchestrator.ts`.)

Add the route, placed directly after the existing `GET /:id` route:

```ts
const HSW_ENTITY_NAME = 'hsw_holiday_swap';

/** GET /api/holiday-swaps/:id/history — audit history for a single swap */
router.get(
  '/:id/history',
  requirePermission('HolidaySwaps', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = req.user?.teamMemberId;
      if (!teamMemberId) throw new AppError('Team member ID not found on authenticated user.', 400);

      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) throw new AppError('Invalid swap ID.', 400);

      const swap = await prisma.holidaySwap.findUnique({
        where: { holidaySwapId: swapId },
        select: { teamMemberId: true },
      });
      if (!swap) throw new AppError('Holiday swap not found.', 404);

      if (swap.teamMemberId !== teamMemberId) {
        const reports = await getReports(teamMemberId, true);
        const isUnderSupervisor = reports.some((r) => r.teamMemberId === swap.teamMemberId);
        if (!isUnderSupervisor) throw new AppError('Access denied.', 403);
      }

      const history = await auditOrchestrator.getHistory(HSW_ENTITY_NAME, String(swapId));
      const data: AuditHistoryEntryDTO[] = history.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        createdBy: row.createdBy,
        comment: row.comment,
        oldValues: row.oldValues as Record<string, unknown> | null,
        newValues: row.newValues as Record<string, unknown> | null,
      }));

      res.json({ data });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);
```

Confirm `prisma` is already imported in this file (it's used by the orchestrator, but the route file itself may or may not import it directly — run `grep -n "^import.*prisma" src/routes/holidaySwap.routes.ts` first; if it isn't imported, add `import { prisma } from '../db/prisma';` alongside the other imports, matching the path used elsewhere in `src/routes/`).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Write a unit test for the access-check logic in isolation**

Since this repo has no route-level test convention (confirmed during planning — no `supertest`, no route mocking anywhere), test the access-scoping logic as a plain function instead of through Express. Extract the scoping check into a small testable helper:

```ts
// src/services/holidaySwap/canViewSwap.ts
import { getReports } from '../teamMember/queries/getReports';

export async function canViewSwap(requestingTeamMemberId: number, swapTeamMemberId: number): Promise<boolean> {
  if (swapTeamMemberId === requestingTeamMemberId) return true;
  const reports = await getReports(requestingTeamMemberId, true);
  return reports.some((r) => r.teamMemberId === swapTeamMemberId);
}
```

```ts
// src/services/holidaySwap/canViewSwap.test.ts
import { describe, it, expect, vi } from 'vitest';
import { canViewSwap } from './canViewSwap';
import * as getReportsModule from '../teamMember/queries/getReports';

describe('canViewSwap', () => {
  it('returns true when the requester is the swap owner', async () => {
    expect(await canViewSwap(10, 10)).toBe(true);
  });

  it('returns true when the swap owner is in the requester reports', async () => {
    vi.spyOn(getReportsModule, 'getReports').mockResolvedValue([{ teamMemberId: 20 } as never]);
    expect(await canViewSwap(10, 20)).toBe(true);
  });

  it('returns false when the swap owner is not in the requester reports', async () => {
    vi.spyOn(getReportsModule, 'getReports').mockResolvedValue([{ teamMemberId: 99 } as never]);
    expect(await canViewSwap(10, 20)).toBe(false);
  });
});
```

Run: `npx vitest run src/services/holidaySwap/canViewSwap.test.ts`
Expected: PASS (3 tests)

Then update the route in Step 3 to call `canViewSwap(teamMemberId, swap.teamMemberId)` instead of inlining the same logic, replacing the `if (swap.teamMemberId !== teamMemberId) { ... }` block with:
```ts
      if (!(await canViewSwap(teamMemberId, swap.teamMemberId))) {
        throw new AppError('Access denied.', 403);
      }
```
and importing `canViewSwap` instead of `getReports` directly in the route file.

- [ ] **Step 6: Commit**

```bash
git add shared/dto/AuditHistory.ts src/routes/holidaySwap.routes.ts \
        src/services/holidaySwap/canViewSwap.ts src/services/holidaySwap/canViewSwap.test.ts
git commit -m "feat(holiday-swaps): add GET /:id/history route"
```

---

### Task 4: Frontend holiday name/status lookup + field map

**Files:**
- Create: `client/src/hooks/useHolidayLookups.ts`
- Create: `client/src/pages/holiday-swaps/changelog/holidaySwapFieldMap.ts`

- [ ] **Step 1: Create the holiday name lookup hook**

Reuses the same `/api/holidays` endpoint already called ad hoc in `RequestSwapDialog.tsx`/`ExceptionSwapForm.tsx`, but as a cached, shared React Query hook (those two components keep their own local-state fetches — not being touched by this plan):

```ts
// client/src/hooks/useHolidayLookups.ts
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { HolidayDTO } from '@shared/dto/Holiday';

export function useHolidayList() {
  return useQuery<HolidayDTO[]>({
    queryKey: ['holidays-all'],
    queryFn: () => apiGet<HolidayDTO[]>('/api/holidays'),
    staleTime: 300_000,
  });
}

/** holidayId -> holidayName map, built from the cached holiday list. */
export function useHolidayNameMap(): Record<number, string> {
  const { data = [] } = useHolidayList();
  return Object.fromEntries(data.map((h) => [h.holidayId, h.holidayName]));
}
```

- [ ] **Step 2: Create the holiday-swap field map**

Verified raw column names (from `prisma/schema.prisma`'s `HolidaySwap` model, `@@map("hsw_holiday_swap")`): `hol_id` (Prisma field `holidayId`), `hsw_original_date` (`originalDate`), `hsw_replacement_date` (`replacementDate`), `sta_id` (`statusId`), `hsw_active` (`active`). **Important:** the audit snapshots are captured from the Prisma result object (`created`/`before`/`updated` in the orchestrator), not a raw SQL row — so the JSON keys are the **Prisma field names** (`holidayId`, `originalDate`, `replacementDate`, `statusId`, `active`), not the DB column names. This differs from time-off, where `fetchRawTimeOffRow` uses `SELECT * FROM ...` and stores raw column names instead.

Holiday swaps reuse the shared `TimeOffStatus` model for status ids — same values as time-off: `2` Approved, `5` Rejected (per `client/src/lib/badge-utils.ts`).

```ts
// client/src/pages/holiday-swaps/changelog/holidaySwapFieldMap.ts
import type { FieldMapEntry } from '@/lib/changelog/buildFieldDiff';
import { formatUTCDate } from '@/lib/utils';

export const HOLIDAY_SWAP_APPROVED_STATUS_IDS = [2];
export const HOLIDAY_SWAP_REJECTED_STATUS_IDS = [5];
export const HOLIDAY_SWAP_ACTIVE_KEY = 'active';
export const HOLIDAY_SWAP_STATUS_KEY = 'statusId';

export function buildHolidaySwapFieldMap(
  holidayNameMap: Record<number, string>,
  statusNameMap: Record<number, string>,
): FieldMapEntry[] {
  return [
    { key: 'holidayId', label: 'Holiday', formatter: (v) => holidayNameMap[Number(v)] ?? String(v) },
    { key: 'originalDate', label: 'Holiday Date', formatter: (v) => formatUTCDate(String(v)) },
    { key: 'replacementDate', label: 'Replacement Date', formatter: (v) => formatUTCDate(String(v)) },
    { key: 'statusId', label: 'Status', formatter: (v) => statusNameMap[Number(v)] ?? String(v) },
  ];
}
```

`statusNameMap` here is the same `useStatusNameMap()` hook built in PLAN-01 Task 3 (`client/src/hooks/useTimeOffLookups.ts`) — holiday swaps and time-off share the same `TimeOffStatus` table, so no separate status hook is needed.

- [ ] **Step 3: Typecheck**

Run (from `client/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useHolidayLookups.ts client/src/pages/holiday-swaps/changelog/holidaySwapFieldMap.ts
git commit -m "feat(holiday-swaps): add holiday name lookup and field map for changelog diff"
```

---

### Task 5: Wire history + `ChangeLogDiff` into the shared swap detail page

**Files:**
- Modify: `client/src/pages/holiday-swaps/hooks/useHolidaySwapDetail.ts`
- Modify: `client/src/pages/holiday-swaps/detail/index.tsx`

- [ ] **Step 1: Add a history fetch to the detail hook**

Add to `client/src/pages/holiday-swaps/hooks/useHolidaySwapDetail.ts` (alongside the existing `detail`/`loadDetail` state, following the exact same `useState`/`useCallback`/`apiGet`/`ApiError` pattern already used in this file for `detail`):

```ts
import type { AuditHistoryEntryDTO } from '@shared/dto/AuditHistory';

// inside UseHolidaySwapDetailOptions/hook body, alongside the existing detail/loading/error state:
  const [history, setHistory] = useState<AuditHistoryEntryDTO[]>([]);

  const loadHistory = useCallback(async (swapId: number): Promise<void> => {
    try {
      const data = await apiGet<{ data: AuditHistoryEntryDTO[] }>(`/api/holiday-swaps/${swapId}/history`);
      setHistory(data.data);
    } catch {
      setHistory([]);
    }
  }, []);
```

Add `history` and `loadHistory` to the hook's returned object:
```ts
  return { detail, loading, error, loadDetail, loadHistory, history, cancelSwap, reviewSwap };
```

Note: `GET /api/holiday-swaps/:id` (the existing detail fetch) is a **legacy route returning raw JSON**, so its `apiGet<HolidaySwapDetailDTO>(...)` call has no `.data` unwrap — but the **new** `/history` route follows the `{ data: T }` envelope, so `loadHistory` unwraps `.data` explicitly as shown above. Confirm this matches how `client/src/lib/api.ts`'s `apiGet` actually behaves (per governance, `apiGet` auto-unwraps `{ data: T }` for new routes and returns raw `T` for legacy ones transparently) — if `apiGet` already auto-unwraps, simplify `loadHistory` to `const data = await apiGet<AuditHistoryEntryDTO[]>(...); setHistory(data);` instead. Check `client/src/lib/api.ts`'s `apiGet` implementation before finalizing this step and use whichever form matches its actual behavior.

- [ ] **Step 2: Call `loadHistory` alongside `loadDetail` in the detail page**

In `client/src/pages/holiday-swaps/detail/index.tsx`, find the existing `useEffect` that calls `loadDetail(swapId)` on mount and add a call to `loadHistory(swapId)` there too:

```tsx
  const { detail, loading, error, loadDetail, loadHistory, history, cancelSwap, reviewSwap } = useHolidaySwapDetail({
    // ...existing options unchanged
  });

  useEffect(() => {
    if (swapId) {
      loadDetail(swapId);
      loadHistory(swapId);
    }
  }, [swapId, loadDetail, loadHistory]);
```

(Match this to the file's actual existing `useEffect` dependency list and variable names — read the current effect first with `grep -n "loadDetail(swapId)" -B5 -A5 client/src/pages/holiday-swaps/detail/index.tsx` and adjust only the minimal diff needed to add the `loadHistory` call.)

- [ ] **Step 3: Render the History card**

Add these imports:
```tsx
import { ChangeLogDiff } from '@/components/changelog/ChangeLogDiff';
import { deriveActionBadge } from '@/lib/changelog/deriveActionBadge';
import { useHolidayNameMap } from '@/hooks/useHolidayLookups';
import { useStatusNameMap } from '@/hooks/useTimeOffLookups';
import {
  buildHolidaySwapFieldMap,
  HOLIDAY_SWAP_ACTIVE_KEY,
  HOLIDAY_SWAP_STATUS_KEY,
  HOLIDAY_SWAP_APPROVED_STATUS_IDS,
  HOLIDAY_SWAP_REJECTED_STATUS_IDS,
} from '@/pages/holiday-swaps/changelog/holidaySwapFieldMap';
```

Inside the component body:
```tsx
  const holidayNameMap = useHolidayNameMap();
  const statusNameMap = useStatusNameMap();
  const holidaySwapFieldMap = buildHolidaySwapFieldMap(holidayNameMap, statusNameMap);
```

Insert this new card right after the closing `</div>` of the existing `md:grid-cols-2` details/status grid, before the Cancel/Reject `<Dialog>` blocks:

```tsx
      {/* History */}
      {history.length > 0 && (
        <Card className="mt-6">
          <CardContent>
            <CardTitle className="mb-4">History</CardTitle>
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="flex gap-3 border-l-2 border-muted pl-4 py-1">
                  <ChangeLogDiff
                    action={deriveActionBadge({
                      oldValues: entry.oldValues,
                      newValues: entry.newValues,
                      activeKey: HOLIDAY_SWAP_ACTIVE_KEY,
                      statusKey: HOLIDAY_SWAP_STATUS_KEY,
                      approvedStatusIds: HOLIDAY_SWAP_APPROVED_STATUS_IDS,
                      rejectedStatusIds: HOLIDAY_SWAP_REJECTED_STATUS_IDS,
                    })}
                    oldValues={entry.oldValues}
                    newValues={entry.newValues}
                    fieldMap={holidaySwapFieldMap}
                    comment={entry.comment ?? ''}
                    createdByUserName={entry.createdBy}
                    createdDate={entry.createdAt}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
```

- [ ] **Step 4: Typecheck**

Run (from `client/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run the app. As a supervisor, open a holiday swap detail page for a swap that has been created and then updated/cancelled/reviewed at least once. Confirm:
1. A "History" card appears below the existing details/status cards.
2. Each entry shows the correct action badge (Created/Updated/Approved/Rejected/Cancelled).
3. Expanding an entry shows the correct field diff with resolved holiday and status names (not raw ids).
4. As the swap's own team member (employee role), confirm history still loads (same permission model as the detail view).

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/holiday-swaps/hooks/useHolidaySwapDetail.ts client/src/pages/holiday-swaps/detail/index.tsx
git commit -m "feat(holiday-swaps): show change history on the swap detail page"
```

---

## Self-Review Notes

- **Spec coverage:** audit read path, new route with `{ data: T }` envelope, `AppError` usage, field map with correct Prisma-field-name keys (verified distinct from time-off's raw-SQL-column-name keys), and the History card on the shared detail page are all covered.
- **Type consistency:** `AuditHistoryEntryDTO` (Task 3) is the exact shape consumed by `loadHistory`/`history` in Task 5 and by `ChangeLogDiff`'s `oldValues`/`newValues`/`comment`/`createdByUserName`/`createdDate` props (matching PLAN-01 Task 4's `ChangeLogDiffProps`).
- **Flagged for implementer attention:** Task 5 Step 1 explicitly calls out that `apiGet`'s auto-unwrap behavior must be checked before finalizing `loadHistory`, rather than guessing — this avoids a silent double-unwrap or missing-unwrap bug.

# BSA Exception Swap Detail — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the two backend routes the new BSA exception detail page (PLAN-04) needs: single-swap detail, and swap history — both scoped to the BSA exception flow's existing permission module.

**Architecture:** A new query function `getSwapForBsa` mirrors the existing `getSwapsForBsa` list query but for one swap id, reusing the identical `HolidaySwapDTO` mapping shape. `BsaHolidaySwapOrchestrator` gets a `getSwapDetailException` method wrapping it. Two new routes in `src/routes/holidaySwapException.routes.ts`, gated by the existing `requirePermission('HolidaySwapException', 'read')`, reuse `auditOrchestrator.getHistory` (added in PLAN-02) directly, the same way the TM/supervisor history route does.

**Tech Stack:** Express, Prisma, Vitest.

**Important routing note:** the existing route `GET /exception/:teamMemberId` (a wildcard param route) is already registered in this router. A new route path must **not** collide with it — `GET /exception/:id` would be ambiguous with `/exception/:teamMemberId` since Express can't distinguish them by path shape alone. This plan uses `/exception/swap/:id` and `/exception/swap/:id/history` instead, which are unambiguous and don't require reordering any existing route registrations.

**Depends on:** PLAN-02 Task 1–2 (uses `auditOrchestrator.getHistory` and the `AuditHistoryEntryDTO` type).

---

### Task 1: `getSwapForBsa` single-swap query

**Files:**
- Create: `src/services/teamMember/queries/getSwapForBsa.ts`
- Test: `src/services/teamMember/queries/getSwapForBsa.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/services/teamMember/queries/getSwapForBsa.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getSwapForBsa } from './getSwapForBsa';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    holidaySwap: {
      findUnique: vi.fn(),
    },
  },
}));

describe('getSwapForBsa', () => {
  it('maps a found swap to HolidaySwapDTO', async () => {
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      holidaySwapId: 42,
      teamMemberId: 7,
      holidayId: 3,
      holiday: { holidayName: 'New Year' },
      originalDate: new Date('2026-01-01'),
      replacementDate: new Date('2026-01-05'),
      statusId: 2,
      status: { statusName: 'Approved' },
      active: true,
      createdBy: 'user@example.com',
      createdAt: new Date('2025-12-01'),
    });

    const result = await getSwapForBsa(42);

    expect(result).toEqual({
      holidaySwapId: 42,
      teamMemberId: 7,
      holidayId: 3,
      holidayName: 'New Year',
      originalDate: new Date('2026-01-01'),
      replacementDate: new Date('2026-01-05'),
      statusId: 2,
      statusName: 'Approved',
      active: true,
      createdBy: 'user@example.com',
      createdAt: new Date('2025-12-01'),
    });
  });

  it('returns null when the swap does not exist', async () => {
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getSwapForBsa(999)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from repo root): `npx vitest run src/services/teamMember/queries/getSwapForBsa.test.ts`
Expected: FAIL — `Cannot find module './getSwapForBsa'`

- [ ] **Step 3: Write the implementation**

```ts
// src/services/teamMember/queries/getSwapForBsa.ts
import { prisma } from '../../../db/prisma';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export async function getSwapForBsa(swapId: number): Promise<HolidaySwapDTO | null> {
  const swap = await prisma.holidaySwap.findUnique({
    where: { holidaySwapId: swapId },
    include: {
      holiday: { select: { holidayName: true } },
      status: { select: { statusName: true } },
    },
  });

  if (!swap) return null;

  return {
    holidaySwapId: swap.holidaySwapId,
    teamMemberId: swap.teamMemberId,
    holidayId: swap.holidayId,
    holidayName: swap.holiday.holidayName,
    originalDate: swap.originalDate,
    replacementDate: swap.replacementDate,
    statusId: swap.statusId,
    statusName: swap.status.statusName,
    active: swap.active,
    createdBy: swap.createdBy,
    createdAt: swap.createdAt,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/teamMember/queries/getSwapForBsa.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/teamMember/queries/getSwapForBsa.ts src/services/teamMember/queries/getSwapForBsa.test.ts
git commit -m "feat(holiday-swaps): add getSwapForBsa single-swap query"
```

---

### Task 2: `BsaHolidaySwapOrchestrator.getSwapDetailException`

**Files:**
- Modify: `src/services/holidaySwap/BsaHolidaySwapOrchestrator.ts`
- Test: `src/services/holidaySwap/BsaHolidaySwapOrchestrator.test.ts` (create if it doesn't already exist — confirm with `ls src/services/holidaySwap/BsaHolidaySwapOrchestrator.test.ts` first; if it exists, add this `describe` block to it instead of creating a new file)

- [ ] **Step 1: Write the failing test**

```ts
// src/services/holidaySwap/BsaHolidaySwapOrchestrator.test.ts (new describe block, or new file)
import { describe, it, expect, vi } from 'vitest';
import { BsaHolidaySwapOrchestrator } from './BsaHolidaySwapOrchestrator';
import * as getSwapForBsaModule from '../teamMember/queries/getSwapForBsa';

describe('BsaHolidaySwapOrchestrator.getSwapDetailException', () => {
  it('delegates to getSwapForBsa and returns its result', async () => {
    const dto = { holidaySwapId: 42 } as never;
    vi.spyOn(getSwapForBsaModule, 'getSwapForBsa').mockResolvedValue(dto);
    const orchestrator = new BsaHolidaySwapOrchestrator();

    const result = await orchestrator.getSwapDetailException(42);

    expect(getSwapForBsaModule.getSwapForBsa).toHaveBeenCalledWith(42);
    expect(result).toBe(dto);
  });

  it('throws when the swap is not found', async () => {
    vi.spyOn(getSwapForBsaModule, 'getSwapForBsa').mockResolvedValue(null);
    const orchestrator = new BsaHolidaySwapOrchestrator();

    await expect(orchestrator.getSwapDetailException(999)).rejects.toThrow('Holiday swap not found.');
  });
});
```

(If `BsaHolidaySwapOrchestrator` is exported only as a class with a singleton instance similar to `holidaySwapOrchestrator` — confirm the exact export pattern with `grep -n "export" src/services/holidaySwap/BsaHolidaySwapOrchestrator.ts` before writing this test — adjust `new BsaHolidaySwapOrchestrator()` to whatever the file actually exports if it's singleton-only.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/holidaySwap/BsaHolidaySwapOrchestrator.test.ts`
Expected: FAIL — `orchestrator.getSwapDetailException is not a function`

- [ ] **Step 3: Add the method**

Add this import near the top of `src/services/holidaySwap/BsaHolidaySwapOrchestrator.ts` (alongside the existing `import { getSwapsForBsa } from '../teamMember/queries/getSwapsForBsa';`):
```ts
import { getSwapForBsa } from '../teamMember/queries/getSwapForBsa';
```

Add the method to the class, near `getTeamMemberSwapsException`:
```ts
  async getSwapDetailException(swapId: number): Promise<HolidaySwapDTO> {
    const swap = await getSwapForBsa(swapId);
    if (!swap) throw new Error('Holiday swap not found.');
    return swap;
  }
```

(This intentionally uses a plain `Error`, matching the existing style already used elsewhere in this same file — e.g. `updateSwapException`'s `if (!swap) throw new Error('Holiday swap not found.');` — for consistency within this orchestrator. The new *route* layer in Task 3 below still wraps this in a real `AppError` at the boundary, per governance.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/holidaySwap/BsaHolidaySwapOrchestrator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/holidaySwap/BsaHolidaySwapOrchestrator.ts src/services/holidaySwap/BsaHolidaySwapOrchestrator.test.ts
git commit -m "feat(holiday-swaps): add getSwapDetailException to BsaHolidaySwapOrchestrator"
```

---

### Task 3: New routes — swap detail and swap history

**Files:**
- Modify: `src/routes/holidaySwapException.routes.ts`

- [ ] **Step 1: Add imports**

Add near the top of `src/routes/holidaySwapException.routes.ts` (alongside the existing imports):
```ts
import { AppError } from '../errors/AppError';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';
import type { AuditHistoryEntryDTO } from '@shared/dto/AuditHistory';
```

- [ ] **Step 2: Add the two routes**

Place these directly after the existing `GET /exception/:teamMemberId` route (before the `POST /exception/:teamMemberId` route):

```ts
const HSW_ENTITY_NAME = 'hsw_holiday_swap';

/** GET /api/holiday-swaps/exception/swap/:id — single swap detail for BSA acting-as flow */
router.get(
  '/exception/swap/:id',
  requirePermission('HolidaySwapException', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) throw new AppError('Invalid swap ID.', 400);

      const swap = await bsaHolidaySwapOrchestrator.getSwapDetailException(swapId);
      res.json({ data: swap });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      if (err instanceof Error && err.message === 'Holiday swap not found.') {
        res.status(404).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

/** GET /api/holiday-swaps/exception/swap/:id/history — audit history for BSA acting-as flow */
router.get(
  '/exception/swap/:id/history',
  requirePermission('HolidaySwapException', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) throw new AppError('Invalid swap ID.', 400);

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

Note the detail route's error handling special-cases the plain `Error('Holiday swap not found.')` thrown by `getSwapDetailException` (Task 2) into a 404, since that method intentionally kept the orchestrator's existing plain-`Error` style rather than introducing a mixed pattern inside the orchestrator — the `AppError` boundary is enforced here, at the route layer, which is the new code this plan is responsible for.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/holidaySwapException.routes.ts
git commit -m "feat(holiday-swaps): add BSA exception swap detail and history routes"
```

---

### Task 4: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the backend**

Run: `npm run dev` (or the project's existing dev script — confirm from `package.json` if different) and confirm no startup errors.

- [ ] **Step 2: Verify route registration doesn't collide**

With the server running and a valid BSA session/token, issue:
```bash
curl -s http://localhost:<port>/api/holiday-swaps/exception/swap/<a-real-swap-id> -H "Cookie: <session>"
curl -s http://localhost:<port>/api/holiday-swaps/exception/<a-real-team-member-id> -H "Cookie: <session>"
```
Expected: the first returns `{ "data": { "holidaySwapId": ..., ... } }` (single object); the second still returns the existing team-member swap list unaffected — confirming no route collision was introduced.

- [ ] **Step 3: Verify history route**

```bash
curl -s http://localhost:<port>/api/holiday-swaps/exception/swap/<a-real-swap-id>/history -H "Cookie: <session>"
```
Expected: `{ "data": [ { "id": ..., "createdAt": ..., "createdBy": ..., "comment": ..., "oldValues": ..., "newValues": ... }, ... ] }`, newest entry first.

- [ ] **Step 4: Verify not-found and permission behavior**

```bash
curl -s http://localhost:<port>/api/holiday-swaps/exception/swap/999999999
```
Expected: `404` with `{ "error": "Holiday swap not found." }`. A request without a valid BSA-permissioned session should be rejected by `requirePermission('HolidaySwapException', 'read')` before reaching the handler at all (403/401 per the existing middleware's behavior — no new work needed here, just confirm it still applies to the new routes).

No commit needed for this task (verification only).

---

## Self-Review Notes

- **Spec coverage:** single-swap detail route, history route, `HolidaySwapException` permission gating, and the route-collision avoidance are all covered.
- **Type consistency:** `AuditHistoryEntryDTO` is imported from the same `shared/dto/AuditHistory.ts` file created in PLAN-02 Task 3 — not redefined here.
- **Placeholder check:** the `<port>`/`<session>`/`<a-real-swap-id>` placeholders in Task 4 are manual-verification instructions for the implementer to fill in with real local values, not unresolved plan content — consistent with how manual-verification steps are written throughout this plan set.

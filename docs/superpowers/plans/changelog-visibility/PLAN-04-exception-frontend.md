# BSA Exception Swap Detail — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new BSA exception swap detail page (mirroring the TM/supervisor detail page's structure), move the exception list's inline Approve/Reject/Edit/Cancel actions into it, and add the History section using `ChangeLogDiff`.

**Architecture:** A new page `client/src/pages/holiday-swaps/exception/detail/index.tsx`, registered at `/holiday-swap-exception-detail/:swapId`, fetches swap detail + history via the two routes from PLAN-03. The acting-as user id (`actingAsUserId`), currently chosen once at the top of the exception list page, is threaded through as a query param since every mutation (`updateSwap`/`cancelSwap`/`reviewSwap`) requires it. `ExceptionSwapList`'s per-row Approve/Reject/Edit/Cancel buttons are replaced with a single "View" action that navigates to the new page (passing `actingAsUserId`); the list's parent page (`exception/index.tsx`) drops the now-unused inline dialog/form state for those actions (creating a **new** swap stays on the list page — there's no swap to view details for until one exists).

**Tech Stack:** React, TypeScript, react-router.

**Depends on:** PLAN-03 (calls `GET /api/holiday-swaps/exception/swap/:id` and `.../history`). PLAN-01 (uses `ChangeLogDiff`, `deriveActionBadge`). PLAN-02's holiday-swap field map (`buildHolidaySwapFieldMap` and friends, from `client/src/pages/holiday-swaps/changelog/holidaySwapFieldMap.ts`).

**Route naming decision:** the codebase has two competing precedents for "exception list + exception detail" pairs — the TM/supervisor holiday-swap detail is nested (`/holiday-swaps/:swapId`), while the existing time-off exception pair is flat-hyphenated (`/timeoff-exception` + `/timeoff-exception-detail/:timeOffId`). Since the holiday-swap exception list is *already* registered as the flat `/holiday-swap-exception` (not `/holiday-swaps/exception`), this plan follows the flat-hyphenated time-off-exception precedent for consistency with its own list route: **`/holiday-swap-exception-detail/:swapId`**.

---

### Task 1: New hook + page scaffold (detail, status, history — no actions yet)

**Files:**
- Create: `client/src/pages/holiday-swaps/exception/hooks/useExceptionHolidaySwapDetail.ts`
- Create: `client/src/pages/holiday-swaps/exception/detail/index.tsx`
- Modify: `client/src/routing/app-routing-setup.tsx`

- [ ] **Step 1: Create the detail-fetch hook**

Mirrors `useHolidaySwapDetail.ts`'s shape but points at the exception-flow routes and also exposes `loadHistory`/`history` directly (no separate PLAN-02-style split needed here since this hook is new):

```ts
// client/src/pages/holiday-swaps/exception/hooks/useExceptionHolidaySwapDetail.ts
import { useState, useCallback } from 'react';
import { apiGet, ApiError } from '@/lib/api';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';
import type { AuditHistoryEntryDTO } from '@shared/dto/AuditHistory';

export interface UseExceptionHolidaySwapDetailOptions {
  onError?: (message: string) => void;
}

export function useExceptionHolidaySwapDetail(options?: UseExceptionHolidaySwapDetailOptions) {
  const [detail, setDetail] = useState<HolidaySwapDTO | null>(null);
  const [history, setHistory] = useState<AuditHistoryEntryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<number | null>(null);

  const load = useCallback(async (swapId: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const [detailRes, historyRes] = await Promise.all([
        apiGet<{ data: HolidaySwapDTO }>(`/api/holiday-swaps/exception/swap/${swapId}`),
        apiGet<{ data: AuditHistoryEntryDTO[] }>(`/api/holiday-swaps/exception/swap/${swapId}/history`),
      ]);
      setDetail(detailRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status);
        options?.onError?.(err.message);
      } else {
        setError(500);
        options?.onError?.('Failed to load holiday swap detail');
      }
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { detail, history, loading, error, load, setDetail };
}
```

Confirm `apiGet`'s auto-unwrap behavior first (same caveat as PLAN-02 Task 5 Step 1) — check `client/src/lib/api.ts` and adjust the `{ data: T }` destructuring above to plain `T` if `apiGet` already auto-unwraps `{ data: T }` responses.

- [ ] **Step 2: Scaffold the page (detail + status + history, no actions)**

```tsx
// client/src/pages/holiday-swaps/exception/detail/index.tsx
import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { getStatusBadgeProps } from '@/lib/badge-utils';
import { useToast } from '@/hooks/use-toast';
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
import { useExceptionHolidaySwapDetail } from '../hooks/useExceptionHolidaySwapDetail';

export function HolidaySwapExceptionDetailPage() {
  const { swapId: swapIdParam } = useParams<{ swapId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const actingAsUserIdParam = searchParams.get('actingAsUserId');
  const actingAsUserId = actingAsUserIdParam ? parseInt(actingAsUserIdParam, 10) : null;

  const { detail, history, loading, error, load } = useExceptionHolidaySwapDetail({
    onError: (message) => toast({ title: 'Error', description: message, variant: 'destructive' }),
  });

  const swapId = swapIdParam ? parseInt(swapIdParam, 10) : null;

  useEffect(() => {
    if (swapId && !isNaN(swapId)) {
      load(swapId);
    }
  }, [swapId, load]);

  const holidayNameMap = useHolidayNameMap();
  const statusNameMap = useStatusNameMap();
  const holidaySwapFieldMap = buildHolidaySwapFieldMap(holidayNameMap, statusNameMap);

  const handleBack = () => navigate('/holiday-swap-exception');

  if (loading || !detail) {
    return (
      <div className="container">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <p className="text-sm text-destructive">Failed to load this holiday swap.</p>
        <Button variant="ghost" onClick={handleBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Exception Swaps
        </Button>
      </div>
    );
  }

  const statusBadge = getStatusBadgeProps(detail.statusId);

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <Button onClick={handleBack} variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <ToolbarPageTitle>{`Holiday Swap #${detail.holidaySwapId}`}</ToolbarPageTitle>
              <ToolbarDescription>BSA exception view</ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4" />
              Swap Details
            </CardTitle>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Holiday</dt>
                <dd className="text-sm mt-1">{detail.holidayName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Holiday Date</dt>
                <dd className="text-sm mt-1">{formatUTCDate(detail.originalDate)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Replacement Date</dt>
                <dd className="text-sm mt-1">{formatUTCDate(detail.replacementDate)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4" />
              Status
            </CardTitle>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Current Status</dt>
                <dd className="mt-1">
                  <Badge variant={statusBadge.variant} className={statusBadge.className}>
                    {detail.statusName}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Actions card added in Task 2, Edit added in Task 3 */}

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
    </div>
  );
}
```

Note: `actingAsUserId` is read here but not used yet — Task 2 and 3 add the actions that need it.

- [ ] **Step 3: Register the route**

In `client/src/routing/app-routing-setup.tsx`, add the import alongside the existing `HolidaySwapExceptionPage` import:
```tsx
import { HolidaySwapExceptionDetailPage } from '@/pages/holiday-swaps/exception/detail';
```

Add the route directly after the existing `/holiday-swap-exception` route:
```tsx
<Route path="/holiday-swap-exception-detail/:swapId" element={<HolidaySwapExceptionDetailPage />} />
```

- [ ] **Step 4: Typecheck**

Run (from `client/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Run the app, navigate directly to `/holiday-swap-exception-detail/<a-real-swap-id>?actingAsUserId=<id>` as a BSA user. Confirm the details, status, and history cards render.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/holiday-swaps/exception/hooks/useExceptionHolidaySwapDetail.ts \
        client/src/pages/holiday-swaps/exception/detail/index.tsx \
        client/src/routing/app-routing-setup.tsx
git commit -m "feat(holiday-swaps): scaffold BSA exception swap detail page with history"
```

---

### Task 2: Approve/Reject/Cancel actions on the new page

**Files:**
- Modify: `client/src/pages/holiday-swaps/exception/detail/index.tsx`

Reuses `useExceptionSwapOperations` (already exists, unmodified) and the same status-id constants pattern from the TM/supervisor detail page (`STATUS_ID_ACKNOWLEDGED = 2`, `STATUS_ID_REJECTED = 5`), plus `CancelSwapDialog` (shared, from `../supervisor/components/CancelSwapDialog`, already reused by the exception list today) and `ReviewOverrideDialog` (`../components/ReviewOverrideDialog`) for the reject/cancel confirmation flows.

- [ ] **Step 1: Add imports and state**

Add to the top of `detail/index.tsx`:
```tsx
import { useState } from 'react';
import { CancelSwapDialog } from '../../supervisor/components/CancelSwapDialog';
import { useExceptionSwapOperations } from '../hooks/useExceptionSwapOperations';

const STATUS_ID_ACKNOWLEDGED = 2;
const STATUS_ID_REJECTED = 5;
```

Inside the component body:
```tsx
  const operationsHook = useExceptionSwapOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (message) => toast({ title: 'Error', description: message, variant: 'destructive' }),
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const refresh = () => {
    if (swapId) load(swapId);
  };

  const handleApprove = async () => {
    if (!actingAsUserId || !detail) return;
    await operationsHook.reviewSwap(detail.holidaySwapId, { statusId: STATUS_ID_ACKNOWLEDGED }, actingAsUserId);
    refresh();
  };

  const handleReject = async () => {
    if (!actingAsUserId || !detail) return;
    await operationsHook.reviewSwap(detail.holidaySwapId, { statusId: STATUS_ID_REJECTED }, actingAsUserId);
    refresh();
  };

  const handleConfirmCancel = async (swapIdArg: number, comment: string) => {
    if (!actingAsUserId) return;
    await operationsHook.cancelSwap(swapIdArg, actingAsUserId, { comment });
    refresh();
  };
```

Check the existing `useExceptionSwapOperations` `UseExceptionSwapOperationsOptions` shape (its `onSuccess`/`onError` option names) matches what's used here — confirm with `grep -n "interface.*Options" client/src/pages/holiday-swaps/exception/hooks/useExceptionSwapOperations.ts` and adjust the constructor call above if the option names differ.

- [ ] **Step 2: Add the Actions card**

Insert directly after the details/status `md:grid-cols-2` grid (before the History card added in Task 1):

```tsx
      {actingAsUserId && (
        <Card className="mt-6">
          <CardContent>
            <CardTitle className="mb-4">Actions</CardTitle>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleApprove} disabled={operationsHook.loading}>
                Approve
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={operationsHook.loading}>
                Reject
              </Button>
              <Button variant="outline" onClick={() => setCancelDialogOpen(true)} disabled={operationsHook.loading}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <CancelSwapDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        swap={detail}
        loading={operationsHook.loading}
        onConfirm={handleConfirmCancel}
      />
```

This deliberately keeps the BSA exception flow's original behavior of Approve/Reject firing without a confirmation dialog (unlike the TM/supervisor page's Reject, which requires one) — matching what `ExceptionSwapList`'s non-override Approve/Reject buttons do today. The override-confirmation behavior (`ReviewOverrideDialog`, for reviewing a swap that isn't Tentative) is intentionally deferred to Task 3 alongside Edit, since it shares the "override" concept with editing a non-Tentative swap.

Confirm `CancelSwapDialog`'s exact prop names (`swap`, `onConfirm` signature) by reading `client/src/pages/holiday-swaps/supervisor/components/CancelSwapDialog.tsx` before finalizing this step — the shape above is inferred from its usage in `exception/index.tsx`.

- [ ] **Step 3: Typecheck**

Run (from `client/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

As a BSA user acting as a team member, navigate to the detail page for a Tentative swap. Confirm Approve/Reject/Cancel each work and refresh the page's detail + history (a new History entry should appear after each action).

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/holiday-swaps/exception/detail/index.tsx
git commit -m "feat(holiday-swaps): add approve/reject/cancel actions to exception detail page"
```

---

### Task 3: Edit action + review-override handling

**Files:**
- Modify: `client/src/pages/holiday-swaps/exception/detail/index.tsx`

Editing needs the team member's `countryId` (to filter the holiday picker, same as `ExceptionSwapForm`'s existing `countryId` prop). The swap detail DTO only carries `teamMemberId`, not `countryId` — reuse the existing `GET /api/team-members` list endpoint (already called in `exception/index.tsx` to populate the team-member ComboBox) and find the matching entry, rather than adding a new backend endpoint.

- [ ] **Step 1: Fetch the team member's country**

Add state and a fetch effect:
```tsx
import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import type { TeamMemberDTO } from '@shared/dto/TeamMember';
import { ExceptionSwapForm } from '../components/ExceptionSwapForm';
import { ReviewOverrideDialog } from '../components/ReviewOverrideDialog';
import type { ReviewOverrideTarget } from '../components/ReviewOverrideDialog';

// inside the component body:
  const [countryId, setCountryId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<ReviewOverrideTarget | null>(null);

  useEffect(() => {
    if (!detail) return;
    apiGet<TeamMemberDTO[]>('/api/team-members').then((members) => {
      const match = members.find((m) => m.teamMemberId === detail.teamMemberId);
      setCountryId(match?.countryId ?? null);
    });
  }, [detail?.teamMemberId]);
```

Confirm `TeamMemberDTO` has a `teamMemberId` field with that exact name (matching how `HolidaySwapDTO.teamMemberId` is compared against it) by checking `shared/dto/TeamMember.ts` — adjust the field name in the `.find(...)` call if it differs.

- [ ] **Step 2: Wire Tentative vs. override review decisions**

Replace the Task 2 `handleApprove`/`handleReject` with override-aware versions, matching `ExceptionSwapList`'s existing `isOverride` logic (a non-Tentative swap's review goes through `ReviewOverrideDialog` instead of firing immediately). Tentative status id: confirm the exact value already used elsewhere (`ExceptionSwapList`/`exception/index.tsx` compute it dynamically via `loadStatusIds`-style lookups — check `grep -n "tentativeStatusId" client/src/pages/holiday-swaps/exception/index.tsx` for how the page obtains this value, and fetch/derive it the same way here, e.g. from the same status list already available via `useStatusNameMap`'s underlying `useTimeOffStatusList()` data by matching on a known "Tentative" name, or by importing whatever constant/lookup `exception/index.tsx` uses — do not hardcode a second, possibly-inconsistent literal for it).

```tsx
  const handleApprove = async () => {
    if (!actingAsUserId || !detail) return;
    if (detail.statusId !== tentativeStatusId) {
      setOverrideTarget({ swap: detail, action: 'approve' });
      return;
    }
    await operationsHook.reviewSwap(detail.holidaySwapId, { statusId: STATUS_ID_ACKNOWLEDGED }, actingAsUserId);
    refresh();
  };

  const handleReject = async () => {
    if (!actingAsUserId || !detail) return;
    if (detail.statusId !== tentativeStatusId) {
      setOverrideTarget({ swap: detail, action: 'reject' });
      return;
    }
    await operationsHook.reviewSwap(detail.holidaySwapId, { statusId: STATUS_ID_REJECTED }, actingAsUserId);
    refresh();
  };

  const handleConfirmOverride = async (swapIdArg: number, action: 'approve' | 'reject', comment: string) => {
    if (!actingAsUserId) return;
    const statusId = action === 'approve' ? STATUS_ID_ACKNOWLEDGED : STATUS_ID_REJECTED;
    await operationsHook.reviewSwap(swapIdArg, { statusId, comment }, actingAsUserId);
    refresh();
  };
```

Add the dialog near the existing `<CancelSwapDialog .../>`:
```tsx
      <ReviewOverrideDialog
        open={overrideTarget !== null}
        onOpenChange={(v) => !v && setOverrideTarget(null)}
        target={overrideTarget}
        loading={operationsHook.loading}
        onConfirm={handleConfirmOverride}
      />
```

- [ ] **Step 3: Add the Edit action and inline form**

Add an Edit button to the Actions card built in Task 2:
```tsx
              <Button variant="outline" onClick={() => setEditing((v) => !v)} disabled={operationsHook.loading}>
                {editing ? 'Cancel Edit' : 'Edit'}
              </Button>
```

Render the form conditionally, right after the Actions card:
```tsx
      {editing && detail && (
        <Card className="mt-6">
          <CardContent>
            <CardTitle className="mb-4">Edit Swap</CardTitle>
            <ExceptionSwapForm
              countryId={countryId}
              editingSwap={detail}
              loading={operationsHook.loading}
              disabled={!actingAsUserId}
              onSubmit={async (input) => {
                if (!actingAsUserId) return;
                await operationsHook.updateSwap(detail.holidaySwapId, input, actingAsUserId);
                setEditing(false);
                refresh();
              }}
              onCancelEdit={() => setEditing(false)}
            />
          </CardContent>
        </Card>
      )}
```

Confirm `ExceptionSwapForm`'s exact `onSubmit` signature (does it hand back `UpdateHolidaySwapDTO` directly, or a different shape distinguishing create vs. edit?) by reading `client/src/pages/holiday-swaps/exception/components/ExceptionSwapForm.tsx`'s props interface before finalizing — adjust the callback above to match exactly.

- [ ] **Step 4: Typecheck**

Run (from `client/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Edit a Tentative swap's holiday/date via the new page's Edit form, confirm it saves and the page refreshes with new values and a new History entry showing the diff. Then test approving/rejecting a non-Tentative swap and confirm the override confirmation dialog appears instead of firing immediately.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/holiday-swaps/exception/detail/index.tsx
git commit -m "feat(holiday-swaps): add edit and review-override handling to exception detail page"
```

---

### Task 4: Migrate the list to navigate instead of acting inline

**Files:**
- Modify: `client/src/pages/holiday-swaps/exception/components/ExceptionSwapList.tsx`
- Modify: `client/src/pages/holiday-swaps/exception/index.tsx`

- [ ] **Step 1: Replace the per-row actions cell in `ExceptionSwapList.tsx`**

Replace the entire `actions` column cell (the block with Approve/Reject/Edit/Cancel buttons) with a single navigation action. Add `useNavigate` and an `actingAsUserId` prop:

```tsx
import { useNavigate } from 'react-router';

interface ExceptionSwapListProps {
  swaps: HolidaySwapDTO[];
  loading: boolean;
  actingAsUserId: number | null;
}
```

(Drop `operationLoading`, `tentativeStatusId`, `acknowledgedStatusId`, `rejectedStatusId`, `onEditClick`, `onCancelClick`, `onApprove`, `onReject`, `onApproveOverride`, `onRejectOverride` from the props interface — none of them are used by the list anymore once actions live on the detail page.)

```tsx
{
  id: 'actions',
  header: () => null,
  enableSorting: false,
  cell: ({ row }) => {
    const swap = row.original;
    const navigate = useNavigate();
    return (
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            navigate(
              `/holiday-swap-exception-detail/${swap.holidaySwapId}${
                actingAsUserId ? `?actingAsUserId=${actingAsUserId}` : ''
              }`
            )
          }
        >
          View
        </Button>
      </div>
    );
  },
},
```

**Correction before finalizing:** `useNavigate()` must not be called inside a per-row `cell` render callback (React hook rules — the table renders rows outside the top-level component body in some virtualization/memoization paths, and calling a hook inside a callback passed to `@tanstack/react-table`'s column def is not a stable hook call site). Call `useNavigate()` once at the top of the `ExceptionSwapList` component function instead, and reference the resulting `navigate` function from the closure the `columns` array is built in (the existing file already builds its `columns` via `useMemo` inside the component body — add `navigate` to that `useMemo`'s dependency array).

- [ ] **Step 2: Remove now-unused inline action state and components from `exception/index.tsx`**

Remove: `editingSwap`/`setEditingSwap` state, `cancelTarget`/`setCancelTarget` state, `overrideTarget`/`setOverrideTarget` state, `handleEditClick`, `handleConfirmCancel`, `handleApprove`, `handleReject`, `handleApproveOverride`, `handleRejectOverride`, `handleConfirmOverride`, the `<ExceptionSwapForm editingSwap={editingSwap} .../>` instance (creation still needs a form — see Step 3), the `<CancelSwapDialog .../>` instance, and the `<ReviewOverrideDialog .../>` instance.

Keep: `tentativeStatusId`/`acknowledgedStatusId`/`rejectedStatusId` state and whatever loads them (Task 3 of this plan's detail page reads the same tentative-status lookup logic, so don't delete the source of that logic here — only stop passing it into `ExceptionSwapList`, which no longer needs it).

- [ ] **Step 3: Keep swap creation on the list page**

`ExceptionSwapForm` still renders on the list page for **creating** a new swap (there's no existing swap to view a detail page for until one is created) — keep this instance, but since `editingSwap` state is removed, pass `editingSwap={null}` explicitly (create-mode only) and drop the `onCancelEdit` prop if the form only shows a "cancel" affordance in edit mode (check the form's prop types — if `onCancelEdit` is required, pass a no-op `() => {}`).

Update the `<ExceptionSwapList .../>` usage to the new, smaller prop set:
```tsx
      <ExceptionSwapList
        swaps={swapsHook.swaps}
        loading={swapsHook.loading}
        actingAsUserId={actingAsUserId}
      />
```

- [ ] **Step 4: Typecheck**

Run (from `client/`): `npx tsc --noEmit`
Expected: no errors. Fix any now-unused-import lint errors from the removed dialogs/handlers (`CancelSwapDialog`, `ReviewOverrideDialog`, `ReviewOverrideTarget` imports should be removed from `exception/index.tsx` if no longer referenced there).

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/holiday-swaps/exception/components/ExceptionSwapList.tsx \
        client/src/pages/holiday-swaps/exception/index.tsx
git commit -m "refactor(holiday-swaps): migrate exception list row actions to the new detail page"
```

---

### Task 5: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Full flow as BSA**

Run the app. As a BSA user on `/holiday-swap-exception`:
1. Select a team member and an acting-as user.
2. Create a new swap via the list page's form — confirm it still works exactly as before.
3. Click "View" on the newly created swap — confirm it navigates to `/holiday-swap-exception-detail/<id>?actingAsUserId=<id>` and shows correct details, a "Created" history entry, and Approve/Reject/Cancel/Edit actions.
4. Edit the swap's holiday/date — confirm it saves, the page refreshes, and a new "Updated" history entry with the correct diff appears.
5. Approve the swap (Tentative → Approved) — confirm it fires immediately (no confirmation dialog) and a new "Approved" history entry appears.
6. Navigate back to the list, pick another Tentative swap, reject it directly from the list's... — wait, the list no longer has Approve/Reject buttons; confirm this is intentional per this plan (all review actions now happen on the detail page) and that this matches what was approved.
7. On an already-Approved swap's detail page, click Approve or Reject again — confirm the override confirmation dialog appears (not an immediate action).
8. Cancel a swap from the detail page — confirm the comment dialog appears, submits, and a "Cancelled" history entry appears.

- [ ] **Step 2: Regression check on the TM/supervisor flow (untouched by this plan, but shares components)**

Since `CancelSwapDialog` is shared between the supervisor and exception flows, verify the supervisor holiday-swap detail page (`/holiday-swaps/:swapId`) still cancels correctly — confirm no prop-shape changes leaked into the shared component.

No commit needed for this task (verification only).

---

## Self-Review Notes

- **Spec coverage:** new detail page, migrated edit/cancel/review actions, History section, and routing are all covered. The route-naming ambiguity flagged during research is resolved explicitly at the top of this plan rather than left as an implicit choice.
- **Type consistency:** `useExceptionHolidaySwapDetail`'s `detail`/`history` types match `HolidaySwapDTO`/`AuditHistoryEntryDTO` used identically in PLAN-02/03. `ChangeLogDiff`, `deriveActionBadge`, and the holiday-swap field map are imported, not redefined, from PLAN-01/02.
- **Flagged for implementer attention:** three spots explicitly call for a quick grep-and-confirm before finalizing code, rather than guessing: (1) `CancelSwapDialog`'s exact prop shape (Task 2), (2) `TeamMemberDTO`'s exact id field name (Task 3), (3) how `exception/index.tsx` currently derives `tentativeStatusId` so the detail page reuses the same source instead of a second, possibly-inconsistent lookup (Task 3). These are pre-existing code facts to verify, not open design decisions — the plan doesn't leave any design choice unresolved.
- **Known trade-off surfaced in Task 5's manual verification:** review actions (Approve/Reject) move entirely off the list and onto the detail page. If this reduces workflow speed for BSAs reviewing many swaps in a row, that's worth raising with the user as a follow-up — but it's the direct, expected consequence of the approved "full detail page with actions, mirroring the TM/supervisor page" scope decision, not a bug.

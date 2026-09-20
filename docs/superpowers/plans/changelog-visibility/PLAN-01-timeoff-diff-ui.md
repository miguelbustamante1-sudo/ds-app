# Time-Off Changelog Diff UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain comment-only rendering in the three time-off changelog cards with a field-level diff (old → new per changed field) and an action badge (Created/Updated/Cancelled), collapsed by default.

**Architecture:** Two pure, framework-agnostic utilities (`buildFieldDiff`, `deriveActionBadge`) compute what changed from the raw `changeLogOldValues`/`changeLogNewValues` JSON already returned by the backend. A new shared `ChangeLogDiff` component consumes those utilities plus two extracted lookup hooks (category/status id → name) and renders the badge, comment, author/date line, and a collapsible field-diff list. All three existing time-off detail pages swap their inline changelog JSX for this component.

**Tech Stack:** React, TypeScript, Vitest, React Query, Radix Collapsible (via `client/src/components/ui/collapsible.tsx`), existing `Badge`/`Card` primitives.

---

### Task 1: `buildFieldDiff` pure utility

**Files:**
- Create: `client/src/lib/changelog/buildFieldDiff.ts`
- Test: `client/src/lib/changelog/buildFieldDiff.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// client/src/lib/changelog/buildFieldDiff.test.ts
import { describe, it, expect } from 'vitest';
import { buildFieldDiff, type FieldMapEntry } from './buildFieldDiff';

const fieldMap: FieldMapEntry[] = [
  { key: 'tto_stadat', label: 'Start Date' },
  { key: 'tto_enddat', label: 'End Date' },
  { key: 'sta_id', label: 'Status', formatter: (v) => `status-${String(v)}` },
];

describe('buildFieldDiff', () => {
  it('returns one line per field where old !== new', () => {
    const oldValues = { tto_stadat: '2026-01-12', tto_enddat: '2026-01-14', sta_id: 1 };
    const newValues = { tto_stadat: '2026-01-15', tto_enddat: '2026-01-14', sta_id: 2 };
    const lines = buildFieldDiff(oldValues, newValues, fieldMap);
    expect(lines).toEqual([
      { label: 'Start Date', oldDisplay: '2026-01-12', newDisplay: '2026-01-15' },
      { label: 'Status', oldDisplay: 'status-1', newDisplay: 'status-2' },
    ]);
  });

  it('omits unchanged fields entirely', () => {
    const oldValues = { tto_stadat: '2026-01-12' };
    const newValues = { tto_stadat: '2026-01-12' };
    const lines = buildFieldDiff(oldValues, newValues, [fieldMap[0] as FieldMapEntry]);
    expect(lines).toEqual([]);
  });

  it('treats a null oldValues as Created: emits new-only lines for present fields', () => {
    const newValues = { tto_stadat: '2026-01-12', sta_id: 1 };
    const lines = buildFieldDiff(null, newValues, fieldMap);
    expect(lines).toEqual([
      { label: 'Start Date', oldDisplay: '', newDisplay: '2026-01-12' },
      { label: 'Status', oldDisplay: '', newDisplay: 'status-1' },
    ]);
  });

  it('returns an empty array when newValues is null', () => {
    expect(buildFieldDiff(null, null, fieldMap)).toEqual([]);
  });

  it('displays an em dash for missing values instead of "undefined"', () => {
    const oldValues = { tto_stadat: '2026-01-12' };
    const newValues = { tto_stadat: null };
    const lines = buildFieldDiff(oldValues, newValues, [fieldMap[0] as FieldMapEntry]);
    expect(lines).toEqual([{ label: 'Start Date', oldDisplay: '2026-01-12', newDisplay: '—' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/lib/changelog/buildFieldDiff.test.ts`
Expected: FAIL — `Cannot find module './buildFieldDiff'`

- [ ] **Step 3: Write the implementation**

```ts
// client/src/lib/changelog/buildFieldDiff.ts

export interface FieldMapEntry {
  key: string;
  label: string;
  formatter?: (value: unknown) => string;
}

export interface FieldDiffLine {
  label: string;
  oldDisplay: string;
  newDisplay: string;
}

function formatValue(value: unknown, formatter?: (value: unknown) => string): string {
  if (value === undefined || value === null) return '—';
  return formatter ? formatter(value) : String(value);
}

/**
 * Computes the changed-field lines between two snapshots for a curated field map.
 * When `oldValues` is null (a Created entry), every present field in `newValues`
 * is emitted as a new-only line (`oldDisplay: ''`) rather than diffed.
 */
export function buildFieldDiff(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  fieldMap: FieldMapEntry[],
): FieldDiffLine[] {
  if (!newValues) return [];

  const isCreated = oldValues === null;
  const lines: FieldDiffLine[] = [];

  for (const field of fieldMap) {
    const newRaw = newValues[field.key];

    if (isCreated) {
      if (newRaw === undefined || newRaw === null) continue;
      lines.push({ label: field.label, oldDisplay: '', newDisplay: formatValue(newRaw, field.formatter) });
      continue;
    }

    const oldRaw = (oldValues as Record<string, unknown>)[field.key];
    const oldDisplay = formatValue(oldRaw, field.formatter);
    const newDisplay = formatValue(newRaw, field.formatter);
    if (oldDisplay !== newDisplay) {
      lines.push({ label: field.label, oldDisplay, newDisplay });
    }
  }

  return lines;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/changelog/buildFieldDiff.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/changelog/buildFieldDiff.ts client/src/lib/changelog/buildFieldDiff.test.ts
git commit -m "feat(changelog): add buildFieldDiff utility for field-level change diffs"
```

---

### Task 2: `deriveActionBadge` pure utility

**Files:**
- Create: `client/src/lib/changelog/deriveActionBadge.ts`
- Test: `client/src/lib/changelog/deriveActionBadge.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// client/src/lib/changelog/deriveActionBadge.test.ts
import { describe, it, expect } from 'vitest';
import { deriveActionBadge } from './deriveActionBadge';

describe('deriveActionBadge', () => {
  it('returns Created when oldValues is null', () => {
    expect(deriveActionBadge({ oldValues: null, newValues: { sta_id: 1 } })).toBe('Created');
  });

  it('returns Cancelled when the active flag flips from truthy to falsy', () => {
    const action = deriveActionBadge({
      oldValues: { tto_active: 1, sta_id: 2 },
      newValues: { tto_active: 0, sta_id: 4 },
      activeKey: 'tto_active',
    });
    expect(action).toBe('Cancelled');
  });

  it('returns Cancelled for a boolean active flag too (holiday swaps use booleans)', () => {
    const action = deriveActionBadge({
      oldValues: { active: true },
      newValues: { active: false },
      activeKey: 'active',
    });
    expect(action).toBe('Cancelled');
  });

  it('returns Approved when statusId transitions to an approved status id', () => {
    const action = deriveActionBadge({
      oldValues: { sta_id: 1 },
      newValues: { sta_id: 2 },
      statusKey: 'sta_id',
      approvedStatusIds: [2],
      rejectedStatusIds: [5],
    });
    expect(action).toBe('Approved');
  });

  it('returns Rejected when statusId transitions to a rejected status id', () => {
    const action = deriveActionBadge({
      oldValues: { sta_id: 1 },
      newValues: { sta_id: 5 },
      statusKey: 'sta_id',
      approvedStatusIds: [2],
      rejectedStatusIds: [5],
    });
    expect(action).toBe('Rejected');
  });

  it('falls back to Updated when nothing else matches', () => {
    const action = deriveActionBadge({
      oldValues: { tto_stadat: '2026-01-01' },
      newValues: { tto_stadat: '2026-01-02' },
    });
    expect(action).toBe('Updated');
  });

  it('returns Updated (not Created) when newValues is null but oldValues is present', () => {
    expect(deriveActionBadge({ oldValues: { sta_id: 1 }, newValues: null })).toBe('Updated');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/changelog/deriveActionBadge.test.ts`
Expected: FAIL — `Cannot find module './deriveActionBadge'`

- [ ] **Step 3: Write the implementation**

```ts
// client/src/lib/changelog/deriveActionBadge.ts

export type ChangeLogAction = 'Created' | 'Updated' | 'Cancelled' | 'Approved' | 'Rejected';

export interface ActionBadgeInput {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  activeKey?: string;
  statusKey?: string;
  approvedStatusIds?: number[];
  rejectedStatusIds?: number[];
}

/**
 * Derives a display action (Created/Updated/Cancelled/Approved/Rejected) purely from
 * the before/after snapshots — never from comment text, since comment wording is free
 * text and not a stable contract.
 */
export function deriveActionBadge(input: ActionBadgeInput): ChangeLogAction {
  const { oldValues, newValues, activeKey, statusKey, approvedStatusIds, rejectedStatusIds } = input;

  if (oldValues === null) return 'Created';
  if (!newValues) return 'Updated';

  if (activeKey) {
    const wasActive = Boolean(oldValues[activeKey]);
    const isActive = Boolean(newValues[activeKey]);
    if (wasActive && !isActive) return 'Cancelled';
  }

  if (statusKey) {
    const oldStatus = oldValues[statusKey];
    const newStatus = newValues[statusKey];
    if (oldStatus !== newStatus) {
      const newStatusId = Number(newStatus);
      if (approvedStatusIds?.includes(newStatusId)) return 'Approved';
      if (rejectedStatusIds?.includes(newStatusId)) return 'Rejected';
    }
  }

  return 'Updated';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/changelog/deriveActionBadge.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/changelog/deriveActionBadge.ts client/src/lib/changelog/deriveActionBadge.test.ts
git commit -m "feat(changelog): add deriveActionBadge utility for changelog action labels"
```

---

### Task 3: Extract shared category/status lookup hooks

**Context:** `client/src/pages/reports/time-off/change-log/filters.tsx` currently has two module-private hooks, `useCategoryOptions` and `useStatusOptions`, that fetch `/api/time-off-category` and `/api/time-off-statuses` via React Query and map to `{ value, label }[]`. `ChangeLogDiff` needs the same id→name data as plain maps (`Record<number, string>`), so extract and export the underlying data-fetching hooks into a shared file, and have `filters.tsx` import from there instead of defining its own copies.

**Files:**
- Create: `client/src/hooks/useTimeOffLookups.ts`
- Modify: `client/src/pages/reports/time-off/change-log/filters.tsx`

- [ ] **Step 1: Read the current top of `filters.tsx` to get its exact imports and the two hook definitions**

Run: `sed -n '1,20p;110,135p' client/src/pages/reports/time-off/change-log/filters.tsx`

Confirm the two functions match:
```tsx
function useCategoryOptions(): ComboBoxOption[] {
  const { data = [] } = useQuery<TimeOffCategoryDTO[]>({
    queryKey: ['time-off-categories'],
    queryFn: () => apiGet<TimeOffCategoryDTO[]>('/api/time-off-category'),
    staleTime: 300_000,
  });
  return data.map((c) => ({ value: String(c.categoryId), label: c.categoryName }));
}

function useStatusOptions(): ComboBoxOption[] {
  const { data = [] } = useQuery<TimeOffStatusDTO[]>({
    queryKey: ['time-off-statuses'],
    queryFn: () => apiGet<TimeOffStatusDTO[]>('/api/time-off-statuses'),
    staleTime: 300_000,
  });
  return data.map((s) => ({ value: String(s.statusId), label: s.statusName }));
}
```
If the exact code differs from this (e.g. different type import paths), use what's actually there for Step 2 — this plan's later steps assume `TimeOffCategoryDTO { categoryId: number; categoryName: string }` and `TimeOffStatusDTO { statusId: number; statusName: string }` shapes, which is what the query mapping implies.

- [ ] **Step 2: Create the shared hooks file**

```ts
// client/src/hooks/useTimeOffLookups.ts
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { TimeOffCategoryDTO } from '@shared/dto/TimeOffCategory';
import type { TimeOffStatusDTO } from '@shared/dto/TimeOffStatus';

/** Full list of time-off categories, cached for 5 minutes. */
export function useTimeOffCategoryList() {
  return useQuery<TimeOffCategoryDTO[]>({
    queryKey: ['time-off-categories'],
    queryFn: () => apiGet<TimeOffCategoryDTO[]>('/api/time-off-category'),
    staleTime: 300_000,
  });
}

/** Full list of time-off statuses, cached for 5 minutes. */
export function useTimeOffStatusList() {
  return useQuery<TimeOffStatusDTO[]>({
    queryKey: ['time-off-statuses'],
    queryFn: () => apiGet<TimeOffStatusDTO[]>('/api/time-off-statuses'),
    staleTime: 300_000,
  });
}

/** categoryId -> categoryName map, built from the cached category list. */
export function useCategoryNameMap(): Record<number, string> {
  const { data = [] } = useTimeOffCategoryList();
  return Object.fromEntries(data.map((c) => [c.categoryId, c.categoryName]));
}

/** statusId -> statusName map, built from the cached status list. */
export function useStatusNameMap(): Record<number, string> {
  const { data = [] } = useTimeOffStatusList();
  return Object.fromEntries(data.map((s) => [s.statusId, s.statusName]));
}
```

Confirm the exact import paths for `TimeOffCategoryDTO`/`TimeOffStatusDTO` and `apiGet` match what `filters.tsx` currently imports (check the file's own import block from Step 1) before finalizing this file — use the same paths, not the ones guessed here if they differ.

- [ ] **Step 2b: Update `filters.tsx` to use the shared list hooks instead of its own copies**

Replace the two private functions in `filters.tsx` with:
```tsx
import { useTimeOffCategoryList, useTimeOffStatusList } from '@/hooks/useTimeOffLookups';

function useCategoryOptions(): ComboBoxOption[] {
  const { data = [] } = useTimeOffCategoryList();
  return data.map((c) => ({ value: String(c.categoryId), label: c.categoryName }));
}

function useStatusOptions(): ComboBoxOption[] {
  const { data = [] } = useTimeOffStatusList();
  return data.map((s) => ({ value: String(s.statusId), label: s.statusName }));
}
```
(Keep these two thin wrappers in `filters.tsx` since its `ComboBoxOption[]` shape is specific to that file's combobox usage — only the underlying fetch is now shared, avoiding a duplicated `useQuery` call with a different-shaped result.)

- [ ] **Step 3: Verify the reports page still builds/typechecks**

Run (from `client/`): `npx tsc --noEmit`
Expected: no new errors introduced by this change (pre-existing unrelated errors, if any, are out of scope).

- [ ] **Step 4: Manually verify the reports filter still works**

Run the app (`superpowers:run` skill or existing dev script), navigate to the time-off change-log report page, confirm the Category and Status filter dropdowns still populate correctly.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useTimeOffLookups.ts client/src/pages/reports/time-off/change-log/filters.tsx
git commit -m "refactor(timeoff): extract shared category/status list hooks"
```

---

### Task 4: `ChangeLogDiff` component

**Files:**
- Create: `client/src/components/changelog/ChangeLogDiff.tsx`

- [ ] **Step 1: Write the component**

```tsx
// client/src/components/changelog/ChangeLogDiff.tsx
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatUTCDate } from '@/lib/utils';
import { buildFieldDiff, type FieldMapEntry } from '@/lib/changelog/buildFieldDiff';
import type { ChangeLogAction } from '@/lib/changelog/deriveActionBadge';

const ACTION_BADGE_VARIANT: Record<ChangeLogAction, 'success' | 'secondary' | 'destructive' | 'primary' | 'info'> = {
  Created: 'success',
  Updated: 'primary',
  Cancelled: 'secondary',
  Approved: 'success',
  Rejected: 'destructive',
};

export interface ChangeLogDiffProps {
  action: ChangeLogAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  fieldMap: FieldMapEntry[];
  comment: string;
  createdByUserName: string | null;
  createdDate: string | Date | null;
}

export function ChangeLogDiff({
  action,
  oldValues,
  newValues,
  fieldMap,
  comment,
  createdByUserName,
  createdDate,
}: ChangeLogDiffProps) {
  const [open, setOpen] = useState(false);
  const lines = useMemo(() => buildFieldDiff(oldValues, newValues, fieldMap), [oldValues, newValues, fieldMap]);
  const hasDetail = lines.length > 0 || (oldValues === null && newValues === null);

  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <Badge variant={ACTION_BADGE_VARIANT[action]}>{action}</Badge>
      </div>
      <p className="text-sm">{comment}</p>
      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
        {createdByUserName && <span>{createdByUserName}</span>}
        {createdDate && (
          <>
            {createdByUserName && <span className="rounded-full size-1 bg-muted-foreground/50" />}
            <span>{formatUTCDate(createdDate, 'dd-MMM-yyyy HH:mm')}</span>
          </>
        )}
      </div>
      {lines.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
          <CollapsibleTrigger className="text-xs font-medium text-primary hover:underline">
            {open ? 'Hide' : action === 'Created' ? 'Change details' : `${lines.length} change${lines.length === 1 ? '' : 's'}`}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {lines.map((line) => (
                <li key={line.label}>
                  <span className="font-medium text-foreground">{line.label}</span>
                  {action === 'Created' ? (
                    <> — New: {line.newDisplay}</>
                  ) : (
                    <> — Old: {line.oldDisplay}, New: {line.newDisplay}</>
                  )}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
      {lines.length === 0 && !hasDetail && (
        <p className="mt-2 text-xs text-muted-foreground italic">No detail available</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this new file (import paths for `Badge`, `Collapsible*`, `formatUTCDate` already confirmed to exist in the codebase during design research).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/changelog/ChangeLogDiff.tsx
git commit -m "feat(changelog): add ChangeLogDiff component"
```

---

### Task 5: Wire `ChangeLogDiff` into the three time-off detail pages

**Files:**
- Create: `client/src/pages/timeoff/changelog/timeOffFieldMap.ts`
- Modify: `client/src/pages/timeoff/supervisor/components/TimeOffDetailPanel.tsx`
- Modify: `client/src/pages/timeoff/detail/index.tsx`
- Modify: `client/src/pages/timeoff/exception/detail/index.tsx`

**Verified raw column names** (from `prisma/schema.prisma`'s `TimeOff` model, `@@map("tbl_tms_time_off")`): `tto_stadat`, `tto_enddat`, `sta_id`, `tot_id`, `tto_days`, `tto_active`. Note: `tto_active` is an **integer** column (`0`/`1`), not a boolean — `deriveActionBadge`'s `Boolean(...)` coercion handles this correctly (`Boolean(1) === true`, `Boolean(0) === false`).

Time-off statuses use the shared status ids documented in `client/src/lib/badge-utils.ts`: `1` Tentative, `2` Approved, `3` Taken, `4` Cancelled, `5` Rejected.

- [ ] **Step 1: Create the shared field map + status-id constants**

```ts
// client/src/pages/timeoff/changelog/timeOffFieldMap.ts
import type { FieldMapEntry } from '@/lib/changelog/buildFieldDiff';
import { formatUTCDate } from '@/lib/utils';

export const TIME_OFF_APPROVED_STATUS_IDS = [2];
export const TIME_OFF_REJECTED_STATUS_IDS = [5];
export const TIME_OFF_ACTIVE_KEY = 'tto_active';
export const TIME_OFF_STATUS_KEY = 'sta_id';

export function buildTimeOffFieldMap(
  categoryNameMap: Record<number, string>,
  statusNameMap: Record<number, string>,
): FieldMapEntry[] {
  return [
    { key: 'tto_stadat', label: 'Start Date', formatter: (v) => formatUTCDate(String(v)) },
    { key: 'tto_enddat', label: 'End Date', formatter: (v) => formatUTCDate(String(v)) },
    { key: 'sta_id', label: 'Status', formatter: (v) => statusNameMap[Number(v)] ?? String(v) },
    { key: 'tot_id', label: 'Category', formatter: (v) => categoryNameMap[Number(v)] ?? String(v) },
    { key: 'tto_days', label: 'Days' },
  ];
}
```

- [ ] **Step 2: Replace the changelog block in `TimeOffDetailPanel.tsx`**

Add these imports alongside the existing ones:
```tsx
import { ChangeLogDiff } from '@/components/changelog/ChangeLogDiff';
import { deriveActionBadge } from '@/lib/changelog/deriveActionBadge';
import { useCategoryNameMap, useStatusNameMap } from '@/hooks/useTimeOffLookups';
import {
  buildTimeOffFieldMap,
  TIME_OFF_ACTIVE_KEY,
  TIME_OFF_STATUS_KEY,
  TIME_OFF_APPROVED_STATUS_IDS,
  TIME_OFF_REJECTED_STATUS_IDS,
} from '@/pages/timeoff/changelog/timeOffFieldMap';
```

Inside the component body (before the `return`), add:
```tsx
  const categoryNameMap = useCategoryNameMap();
  const statusNameMap = useStatusNameMap();
  const timeOffFieldMap = buildTimeOffFieldMap(categoryNameMap, statusNameMap);
```

Replace the existing changelog block (the `{/* Changelog */}` section) with:
```tsx
      {/* Changelog */}
      {detail.changeLogs.length > 0 && (
        <Card>
          <CardContent>
            <CardTitle className="text-base mb-4">Changelog</CardTitle>
            <div className="space-y-3">
              {detail.changeLogs.map((log) => (
                <div
                  key={String(log.changeLogId)}
                  className="flex gap-3 border-l-2 border-muted pl-4 py-1"
                >
                  <ChangeLogDiff
                    action={deriveActionBadge({
                      oldValues: log.changeLogOldValues,
                      newValues: log.changeLogNewValues,
                      activeKey: TIME_OFF_ACTIVE_KEY,
                      statusKey: TIME_OFF_STATUS_KEY,
                      approvedStatusIds: TIME_OFF_APPROVED_STATUS_IDS,
                      rejectedStatusIds: TIME_OFF_REJECTED_STATUS_IDS,
                    })}
                    oldValues={log.changeLogOldValues}
                    newValues={log.changeLogNewValues}
                    fieldMap={timeOffFieldMap}
                    comment={log.changeLogComment}
                    createdByUserName={log.createdByUserName ?? null}
                    createdDate={log.changeLogCreatedDate}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
```

- [ ] **Step 3: Apply the equivalent replacement in `client/src/pages/timeoff/detail/index.tsx`**

Same import additions as Step 2. Same body-level `categoryNameMap`/`statusNameMap`/`timeOffFieldMap` setup. The `allChangeLogs` array here includes a synthetic creation entry (`changeLogId: -1`) with `changeLogOldValues`/`changeLogNewValues` fields absent — add them as `null`/`null` so the type matches and `ChangeLogDiff` correctly treats it as Created:

```tsx
  const allChangeLogs = [
    ...(detail.creationComment
      ? [{
          changeLogId: -1,
          changeLogComment: detail.creationComment,
          changeLogCreatedBy: null,
          changeLogCreatedDate: null,
          createdByUserName: null,
          changeLogOldValues: null,
          changeLogNewValues: null,
        }]
      : []),
    ...detail.changeLogs,
  ];
```

Replace the changelog card's inner `.map()` body with the same `<ChangeLogDiff .../>` block shown in Step 2 (same props, reading from the same `log` variable).

- [ ] **Step 4: Apply the equivalent replacement in `client/src/pages/timeoff/exception/detail/index.tsx`**

Same import additions, same `categoryNameMap`/`statusNameMap`/`timeOffFieldMap` setup, same `allChangeLogs` synthetic-entry fix as Step 3 (this file has the identical `allChangeLogs` construction), same `<ChangeLogDiff .../>` swap in its changelog card.

- [ ] **Step 5: Typecheck all three files**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run the app. For each of the three pages:
1. Open a time-off request that has at least one changelog entry with a real update (e.g. a date change or status change).
2. Confirm the badge shows the correct action (Created/Updated/Cancelled).
3. Confirm the comment and author/date line still render as before.
4. Click the "N changes" toggle and confirm the expanded list shows `Label — Old: X, New: Y` lines with resolved category/status names (not raw ids).
5. Confirm a Created entry (or the synthetic creation row) shows "Change details" and, when expanded, lists only `New:` values.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/timeoff/changelog/timeOffFieldMap.ts \
        client/src/pages/timeoff/supervisor/components/TimeOffDetailPanel.tsx \
        client/src/pages/timeoff/detail/index.tsx \
        client/src/pages/timeoff/exception/detail/index.tsx
git commit -m "feat(timeoff): show field-level diff and action badge in changelog cards"
```

---

## Self-Review Notes (for the plan author, already applied above)

- **Spec coverage:** field map, action badge derivation, collapsed-by-default UI, Created-entry handling, and all three integration points from the design spec are each covered by a task above.
- **Type consistency:** `FieldMapEntry`/`FieldDiffLine` (Task 1) are the exact types imported and used in Task 4's `ChangeLogDiff` and Task 5's `timeOffFieldMap.ts`. `ChangeLogAction` (Task 2) is the exact type used as `ChangeLogDiffProps['action']` in Task 4.
- **Known pre-existing discrepancy, not replicated:** the admin report's `changeLogQueries.ts` reads `toc_old_values->>'active'` and `->>'days'`, which do not match the real column names (`tto_active`, `tto_days`) — this plan uses the verified real column names and does not copy that mismatch.

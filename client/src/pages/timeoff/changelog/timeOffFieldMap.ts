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

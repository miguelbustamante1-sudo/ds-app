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

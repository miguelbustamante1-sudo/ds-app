import { parseUTCDateAsLocal } from '@/lib/utils';

/**
 * statusId values treated as "cancelled-ish" for the exception list's Show Cancelled toggle.
 * 4 = Cancelled, 5 = Rejected, 6 = Split.
 */
export const EXCLUDED_STATUS_IDS = [4, 5, 6] as const;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** True when a time-off's end date is strictly before the start of referenceDate's calendar day. */
export function isPastTimeOff(endDate: string | Date, referenceDate: Date = new Date()): boolean {
  const end = parseUTCDateAsLocal(endDate);
  return end < startOfLocalDay(referenceDate);
}

/** True when statusId is Cancelled (4), Rejected (5), or Split (6). */
export function isExcludedStatus(statusId: number | null): boolean {
  return statusId !== null && (EXCLUDED_STATUS_IDS as readonly number[]).includes(statusId);
}

/**
 * Filters records the same way the exception list's Past/Cancelled toggles do, used to derive
 * Category/Status filter option lists that only offer values currently reachable.
 */
export function filterVisibleForOptions<T extends { timeOffEndDate: string | Date; statusId: number | null }>(
  timeOffs: T[],
  showPast: boolean,
  showCancelled: boolean,
  referenceDate: Date = new Date()
): T[] {
  return timeOffs.filter((t) => {
    if (!showPast && isPastTimeOff(t.timeOffEndDate, referenceDate)) return false;
    if (!showCancelled && isExcludedStatus(t.statusId)) return false;
    return true;
  });
}

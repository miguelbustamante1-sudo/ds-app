import { parseUTCDateAsLocal } from '@/lib/utils';

export interface SplitSiblingStatusInput {
  timeOffEndDate: Date | string;
  statusName: string;
}

/**
 * Mirrors the backend guard in `cancelSplitLeg` (statusId Taken, or end date
 * in the past) so the UI can block/warn before the request even reaches the
 * server. The backend remains authoritative.
 */
export function isSplitSiblingPassed(sibling: SplitSiblingStatusInput): boolean {
  if (sibling.statusName.toLowerCase().trim() === 'taken') return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseUTCDateAsLocal(sibling.timeOffEndDate).getTime() < today.getTime();
}

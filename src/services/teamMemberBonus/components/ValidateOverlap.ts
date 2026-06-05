/**
 * Overlap Validation Component
 * No two bonuses of the same BCA for the same team member may cover an overlapping period.
 * Null startDate = −Infinity. Null endDate = +Infinity.
 */

import { TeamMemberBonusOverlapError } from '../errors';

interface DateRange {
  bonusStartDate: Date | null;
  bonusEndDate: Date | null;
}

function rangesOverlap(a: DateRange, b: DateRange): boolean {
  const aStart = a.bonusStartDate ? a.bonusStartDate.getTime() : -Infinity;
  const aEnd   = a.bonusEndDate   ? a.bonusEndDate.getTime()   :  Infinity;
  const bStart = b.bonusStartDate ? b.bonusStartDate.getTime() : -Infinity;
  const bEnd   = b.bonusEndDate   ? b.bonusEndDate.getTime()   :  Infinity;
  return aStart < bEnd && bStart < aEnd;
}

export function validateNoOverlap(incoming: DateRange, existing: DateRange[]): void {
  if (existing.some((e) => rangesOverlap(incoming, e))) {
    throw new TeamMemberBonusOverlapError();
  }
}

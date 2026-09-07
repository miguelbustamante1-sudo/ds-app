import { prisma } from '../../../db/prisma';
import type { AttritionStatusIds } from './LoadAttritionStatusIds';

export interface TimeOffToCancel {
  timeOffId: number;
  statusId: number;
}

export interface TimeOffsToCancel {
  future: TimeOffToCancel[];
  overlapping: TimeOffToCancel[];
}

export async function loadTimeOffsToCancel(
  teamMemberId: number,
  memberEndDate: Date,
  statusIds: AttritionStatusIds,
): Promise<TimeOffsToCancel> {
  const terminalStatuses = [statusIds.cancelled, statusIds.split];

  const [future, overlapping] = await Promise.all([
    // 1. Future: start date is strictly after the member's end date.
    //    Cancel regardless of status (except already terminal).
    prisma.timeOff.findMany({
      where: {
        teamMemberId,
        timeOffActive: 1,
        timeOffStartDate: { gt: memberEndDate },
        NOT: { statusId: { in: terminalStatuses } },
      },
      select: { timeOffId: true, statusId: true },
    }),

    // 2. Overlapping: started before/on end date but ends after it.
    //    Only cancel Tentative (pending) ones — approved requests need human review.
    prisma.timeOff.findMany({
      where: {
        teamMemberId,
        timeOffActive: 1,
        timeOffStartDate: { lte: memberEndDate },
        timeOffEndDate:   { gt: memberEndDate },
        statusId: statusIds.tentative,
      },
      select: { timeOffId: true, statusId: true },
    }),
  ]);

  // statusId is Int? in the schema but the WHERE clause filters for a specific statusId value,
  // so any row returned structurally has a non-null statusId.
  const isTimeOffToCancel = (r: { timeOffId: number; statusId: number | null }): r is TimeOffToCancel =>
    r.statusId !== null;

  return {
    future:      future.filter(isTimeOffToCancel),
    overlapping: overlapping.filter(isTimeOffToCancel),
  };
}

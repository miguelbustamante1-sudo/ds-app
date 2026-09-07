import { prisma } from '../../../db/prisma';
import type { DateWindow } from './resolveWindows';
import { TIME_OFF_HUB_EXCLUDED_STATUS_IDS } from './excludedStatusIds';
import type { TimeOffHubSummaryRecord } from '../TimeOffHubOrchestrator';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Fetches active TimeOff records for the given team members that overlap
 * the given window. Reused for both the "upcoming 45 days" tab and (with a
 * different window) the "this week" tab — see TimeOffHubOrchestrator.
 */
export async function fetchUpcomingTimeOffRecords(
  teamMemberIds: number[],
  window: DateWindow,
): Promise<TimeOffHubSummaryRecord[]> {
  if (teamMemberIds.length === 0) return [];

  const rows = await prisma.timeOff.findMany({
    where: {
      teamMemberId: { in: teamMemberIds },
      timeOffActive: 1,
      timeOffEndDate: { gte: window.from },
      timeOffStartDate: { lte: window.to },
      statusId: { notIn: TIME_OFF_HUB_EXCLUDED_STATUS_IDS },
    },
    include: {
      teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true, workdayId: true } },
      category: { select: { categoryName: true } },
      status: { select: { statusName: true } },
    },
    orderBy: { timeOffStartDate: 'asc' },
  });

  return rows
    .filter(
      (r): r is typeof rows[number] & { teamMemberId: number; statusId: number } =>
        r.teamMemberId !== null && r.statusId !== null,
    )
    .map((r) => {
      const record: TimeOffHubSummaryRecord = {
        id: `tto-${r.timeOffId}`,
        type: 'TimeOff',
        recordId: r.timeOffId,
        teamMemberId: r.teamMemberId,
        teamMemberNames: r.teamMember?.teamMemberNames ?? '',
        teamMemberSurnames: r.teamMember?.teamMemberSurnames ?? '',
        workdayId: r.teamMember?.workdayId ?? null,
        date: isoDate(new Date(r.timeOffStartDate)),
        endDate: isoDate(new Date(r.timeOffEndDate)),
        statusId: r.statusId,
        statusName: r.status?.statusName ?? '',
      };
      if (r.category?.categoryName) {
        record.categoryName = r.category.categoryName;
      }
      return record;
    });
}

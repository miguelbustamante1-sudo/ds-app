import { prisma } from '../../../db/prisma';
import type { DateWindow } from './resolveWindows';
import { TIME_OFF_HUB_EXCLUDED_STATUS_IDS } from './excludedStatusIds';
import type { TimeOffHubSummaryRecord } from '../TimeOffHubOrchestrator';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Fetches active HolidaySwap records for the given team members that
 * overlap the given window. Reused for both the "upcoming 45 days" tab and
 * (with a different window) the "this week" tab.
 */
export async function fetchUpcomingHolidaySwapRecords(
  teamMemberIds: number[],
  window: DateWindow,
): Promise<TimeOffHubSummaryRecord[]> {
  if (teamMemberIds.length === 0) return [];

  const rows = await prisma.holidaySwap.findMany({
    where: {
      teamMemberId: { in: teamMemberIds },
      active: true,
      replacementDate: { gte: window.from },
      originalDate: { lte: window.to },
      statusId: { notIn: TIME_OFF_HUB_EXCLUDED_STATUS_IDS },
    },
    include: {
      teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true, workdayId: true } },
      status: { select: { statusName: true } },
    },
    orderBy: { originalDate: 'asc' },
  });

  return rows.map((r) => ({
    id: `hsw-${r.holidaySwapId}`,
    type: 'HolidaySwap' as const,
    recordId: r.holidaySwapId,
    teamMemberId: r.teamMemberId,
    teamMemberNames: r.teamMember.teamMemberNames,
    teamMemberSurnames: r.teamMember.teamMemberSurnames,
    workdayId: r.teamMember.workdayId ?? null,
    date: isoDate(new Date(r.originalDate)),
    endDate: isoDate(new Date(r.replacementDate)),
    statusId: r.statusId,
    statusName: r.status?.statusName ?? '',
  }));
}

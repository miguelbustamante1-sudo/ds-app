import { prisma } from '../../../db/prisma';
import type { TimeOffExternalFeedEntryDTO } from '@shared/dto/TimeOffExternalFeed';

// Cancelled (4), Rejected (5), Split (6), InAuth (7) — not "really happening" time-offs.
const EXCLUDED_STATUS_IDS = [4, 5, 6, 7];

export async function getTimeOffFeed(startDate: Date, endDate: Date): Promise<TimeOffExternalFeedEntryDTO[]> {
  // Normalized to midnight UTC so the comparison is calendar-day (matches how
  // date-only columns like tto_enddat are stored), not sensitive to what time
  // of day this query happens to run.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const rows = await prisma.timeOff.findMany({
    where: {
      timeOffActive: 1,
      statusId: { notIn: EXCLUDED_STATUS_IDS },
      timeOffStartDate: { lte: endDate },
      // Overlaps the caller's range AND hasn't already ended — past time-offs are excluded
      // from the feed even if the caller's range covers them.
      timeOffEndDate: { gte: startDate, gt: today },
      teamMember: { workdayId: { not: null } },
    },
    select: {
      teamMemberId: true,
      timeOffStartDate: true,
      timeOffEndDate: true,
      status: { select: { statusName: true, statusShortName: true } },
      category: { select: { categoryName: true, categoryShortName: true } },
      teamMember: {
        select: {
          workdayId: true,
          teamMemberNames: true,
          teamMemberSurnames: true,
          teamMemberKnownAs: true,
        },
      },
    },
    orderBy: { timeOffStartDate: 'asc' },
  });

  const teamMemberIds = [...new Set(rows.map((row) => row.teamMemberId).filter((id): id is number => id !== null))];
  const users = await prisma.user.findMany({
    where: { teamMemberId: { in: teamMemberIds } },
    select: { teamMemberId: true, userEmail: true },
  });
  const emailByTeamMemberId = new Map(users.map((user) => [user.teamMemberId, user.userEmail]));

  const result: TimeOffExternalFeedEntryDTO[] = [];
  for (const row of rows) {
    if (!row.teamMember?.workdayId) continue;
    result.push({
      workdayId: row.teamMember.workdayId,
      email: emailByTeamMemberId.get(row.teamMemberId) ?? null,
      name: `${row.teamMember.teamMemberNames} ${row.teamMember.teamMemberSurnames}`,
      knownAs: row.teamMember.teamMemberKnownAs ?? null,
      startDate: row.timeOffStartDate,
      endDate: row.timeOffEndDate,
      status: row.status?.statusName ?? 'Unknown',
      statusShortName: row.status?.statusShortName ?? null,
      type: row.category?.categoryName ?? 'Unknown',
      typeShortName: row.category?.categoryShortName ?? null,
    });
  }
  return result;
}

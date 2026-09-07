import { prisma } from '../../../../db/prisma';
import type { PendingRequestsTeamMember } from '../../../teamMember/queries/getReportsForPendingRequests';
import type { PendingHolidaySwapRequest } from '@shared/dto/PendingRequest';

/**
 * Queries hsw_holiday_swap for Tentative records belonging to the given
 * team members and maps them to the PendingHolidaySwapRequest shape.
 */
export async function loadPendingHolidaySwaps(
  members: PendingRequestsTeamMember[],
  tentativeStatusId: number,
): Promise<PendingHolidaySwapRequest[]> {
  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.teamMemberId);

  const records = await prisma.holidaySwap.findMany({
    where: {
      teamMemberId: { in: memberIds },
      statusId: tentativeStatusId,
      active: true,
    },
    include: {
      holiday: { select: { holidayName: true } },
      status: { select: { statusName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const memberMap = new Map(members.map((m) => [m.teamMemberId, m]));

  return records.map((r): PendingHolidaySwapRequest => {
    const member = memberMap.get(r.teamMemberId)!;
    return {
      type: 'HolidaySwap',
      entityId: r.holidaySwapId,
      teamMemberId: r.teamMemberId,
      teamMemberNames: member.teamMemberNames,
      teamMemberSurnames: member.teamMemberSurnames,
      statusId: r.statusId,
      statusName: r.status.statusName,
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
      createdBy: r.createdBy ?? null,
      holidayName: r.holiday.holidayName,
      originalDate: r.originalDate.toISOString(),
      replacementDate: r.replacementDate.toISOString(),
    };
  });
}

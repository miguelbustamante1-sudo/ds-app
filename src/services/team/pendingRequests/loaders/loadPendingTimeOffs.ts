import { prisma } from '../../../../db/prisma';
import type { PendingRequestsTeamMember } from '../../../teamMember/queries/getReportsForPendingRequests';
import type { PendingTimeOffRequest } from '@shared/dto/PendingRequest';

/**
 * Queries tbl_tms_time_off for Tentative records belonging to the given
 * team members and maps them to the PendingTimeOffRequest shape.
 */
export async function loadPendingTimeOffs(
  members: PendingRequestsTeamMember[],
  tentativeStatusId: number,
): Promise<PendingTimeOffRequest[]> {
  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.teamMemberId);

  const records = await prisma.timeOff.findMany({
    where: {
      teamMemberId: { in: memberIds },
      statusId: tentativeStatusId,
      timeOffActive: 1,
    },
    include: {
      category: { select: { categoryName: true } },
      status: { select: { statusName: true } },
      createdByUser: { select: { userEmail: true } },
    },
    orderBy: { timeOffCreatedDate: 'desc' },
  });

  const memberMap = new Map(members.map((m) => [m.teamMemberId, m]));

  return records
    .filter((r) => r.teamMemberId != null)
    .map((r): PendingTimeOffRequest => {
      const member = memberMap.get(r.teamMemberId!)!;
      return {
        type: 'TimeOff',
        entityId: r.timeOffId,
        teamMemberId: r.teamMemberId!,
        teamMemberNames: member.teamMemberNames,
        teamMemberSurnames: member.teamMemberSurnames,
        statusId: r.statusId ?? tentativeStatusId,
        statusName: r.status?.statusName ?? 'Tentative',
        createdAt: r.timeOffCreatedDate ? r.timeOffCreatedDate.toISOString() : null,
        createdBy: r.createdByUser?.userEmail ?? null,
        categoryName: r.category?.categoryName ?? '',
        timeOffStartDate: r.timeOffStartDate.toISOString(),
        timeOffEndDate: r.timeOffEndDate.toISOString(),
        timeOffDays: Number(r.timeOffDays),
      };
    });
}

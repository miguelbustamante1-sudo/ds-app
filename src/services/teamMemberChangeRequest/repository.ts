import { prisma } from '../../db/prisma';
import type { Prisma, TeamMemberChangeRequest } from '@prisma/client';

export const TABLE = 'tmc_team_member_change_requests';

const INCLUDE = {
  teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
  requestedByUser: { select: { userName: true } },
  reviewedByUser: { select: { userName: true } },
} satisfies Prisma.TeamMemberChangeRequestInclude;

export type ChangeRequestWithDetails = Prisma.TeamMemberChangeRequestGetPayload<{ include: typeof INCLUDE }>;

export async function createChangeRequest(
  data: Prisma.TeamMemberChangeRequestUncheckedCreateInput,
): Promise<ChangeRequestWithDetails> {
  return prisma.teamMemberChangeRequest.create({ data, include: INCLUDE });
}

export async function getChangeRequestById(id: number): Promise<ChangeRequestWithDetails | null> {
  return prisma.teamMemberChangeRequest.findUnique({ where: { changeRequestId: id }, include: INCLUDE });
}

export async function getPendingChangeRequests(): Promise<ChangeRequestWithDetails[]> {
  return prisma.teamMemberChangeRequest.findMany({
    where: { status: 'Pending' },
    include: INCLUDE,
    orderBy: { requestedAt: 'asc' },
  });
}

export async function getPendingChangeRequestTeamMemberIds(teamMemberIds: number[]): Promise<number[]> {
  const rows = await prisma.teamMemberChangeRequest.findMany({
    where: { teamMemberId: { in: teamMemberIds }, status: 'Pending' },
    select: { teamMemberId: true },
  });
  return rows.map((r) => r.teamMemberId);
}

export async function updateChangeRequestStatus(
  id: number,
  data: { status: 'Approved' | 'Rejected'; reviewedBy: number; reviewComment: string | null },
): Promise<TeamMemberChangeRequest> {
  return prisma.teamMemberChangeRequest.update({
    where: { changeRequestId: id },
    data: {
      status: data.status,
      reviewedBy: data.reviewedBy,
      reviewedAt: new Date(),
      reviewComment: data.reviewComment,
    },
  });
}

import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { TeamMemberOncallDTO } from '@shared/dto/TeamMemberOncall';
import { TeamMemberOncallNotFoundError } from './errors';

export const TABLE = 'tmo_team_member_oncall';

const includeRelations = {
  teamMember: {
    select: {
      teamMemberId: true,
      teamMemberNames: true,
      teamMemberSurnames: true,
      workdayId: true,
    },
  },
  payrol: {
    select: {
      prlId: true,
      prlDescription: true,
      prlMonth: true,
      prlYear: true,
    },
  },
} satisfies Prisma.TmoTeamMemberOncallInclude;

type OncallWithRelations = Prisma.TmoTeamMemberOncallGetPayload<{
  include: typeof includeRelations;
}>;

function toDTO(r: OncallWithRelations): TeamMemberOncallDTO {
  return {
    oncallId: r.oncallId,
    teamMemberId: r.teamMemberId,
    oncallAmount: r.oncallAmount.toString(),
    oncallDate: r.oncallDate.toISOString(),
    payrolId: r.payrolId,
    oncallFrequency: r.oncallFrequency,
    oncallCreatedBy: r.oncallCreatedBy,
    oncallCreatedAt: r.oncallCreatedAt.toISOString(),
    oncallUpdatedBy: r.oncallUpdatedBy,
    oncallUpdatedAt: r.oncallUpdatedAt.toISOString(),
    teamMember: r.teamMember,
    payrol: r.payrol,
  };
}

export async function getAllTeamMemberOncalls(): Promise<TeamMemberOncallDTO[]> {
  const results = await prisma.tmoTeamMemberOncall.findMany({
    include: includeRelations,
    orderBy: { oncallId: 'asc' },
  });
  return results.map(toDTO);
}

export async function getTeamMemberOncallById(
  id: number,
): Promise<TeamMemberOncallDTO | null> {
  const result = await prisma.tmoTeamMemberOncall.findUnique({
    where: { oncallId: id },
    include: includeRelations,
  });
  return result ? toDTO(result) : null;
}

export async function createTeamMemberOncall(
  payload: Prisma.TmoTeamMemberOncallUncheckedCreateInput,
): Promise<TeamMemberOncallDTO> {
  const result = await prisma.tmoTeamMemberOncall.create({
    data: payload,
    include: includeRelations,
  });
  return toDTO(result);
}

export async function updateTeamMemberOncall(
  id: number,
  payload: Prisma.TmoTeamMemberOncallUncheckedUpdateInput,
): Promise<TeamMemberOncallDTO> {
  const result = await prisma.tmoTeamMemberOncall.update({
    where: { oncallId: id },
    data: payload,
    include: includeRelations,
  });
  return toDTO(result);
}

export async function deleteTeamMemberOncall(id: number): Promise<void> {
  await prisma.tmoTeamMemberOncall.delete({
    where: { oncallId: id },
  });
}

export async function bulkDeleteTeamMemberOncalls(
  ids: number[],
): Promise<TeamMemberOncallDTO[]> {
  return prisma.$transaction(async (tx) => {
    const deleted: TeamMemberOncallDTO[] = [];
    for (const id of ids) {
      const existing = await tx.tmoTeamMemberOncall.findUnique({
        where: { oncallId: id },
        include: includeRelations,
      });
      if (!existing) {
        throw new TeamMemberOncallNotFoundError();
      }
      await tx.tmoTeamMemberOncall.delete({ where: { oncallId: id } });
      deleted.push(toDTO(existing));
    }
    return deleted;
  });
}

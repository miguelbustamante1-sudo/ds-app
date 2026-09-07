import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { TeamMemberBonusDTO } from '@shared/dto/TeamMemberBonus';

export const TABLE = 'ds.tmb_team_member_bonus';

const includeRelations = {
  teamMember: {
    select: {
      teamMemberId: true,
      teamMemberNames: true,
      teamMemberSurnames: true,
      workdayId: true,
    },
  },
  bonusCategory: {
    select: {
      bonusCategoryId: true,
      bonusCategoryName: true,
    },
  },
} satisfies Prisma.TeamMemberBonusInclude;

type BonusWithRelations = Prisma.TeamMemberBonusGetPayload<{ include: typeof includeRelations }>;

function toDTO(r: BonusWithRelations): TeamMemberBonusDTO {
  return {
    teamMemberBonusId: r.teamMemberBonusId,
    teamMemberId: r.teamMemberId,
    bonusCategoryId: r.bonusCategoryId,
    bonusAmount: r.bonusAmount.toString(),
    bonusPeriodicity: r.bonusPeriodicity,
    bonusStartDate: r.bonusStartDate?.toISOString() ?? null,
    bonusEndDate: r.bonusEndDate?.toISOString() ?? null,
    bonusCreatedBy: r.bonusCreatedBy,
    bonusCreatedAt: r.bonusCreatedAt.toISOString(),
    bonusUpdatedBy: r.bonusUpdatedBy ?? null,
    bonusUpdatedAt: r.bonusUpdatedAt?.toISOString() ?? null,
    teamMember: r.teamMember,
    bonusCategory: r.bonusCategory,
  };
}

export async function getAllTeamMemberBonuses(): Promise<TeamMemberBonusDTO[]> {
  const results = await prisma.teamMemberBonus.findMany({
    include: includeRelations,
    orderBy: { teamMemberBonusId: 'asc' },
  });
  return results.map(toDTO);
}

export async function getTeamMemberBonusById(id: number): Promise<TeamMemberBonusDTO | null> {
  const result = await prisma.teamMemberBonus.findUnique({
    where: { teamMemberBonusId: id },
    include: includeRelations,
  });
  return result ? toDTO(result) : null;
}

export async function getTeamMemberBonusesByMember(
  teamMemberId: number,
): Promise<TeamMemberBonusDTO[]> {
  const results = await prisma.teamMemberBonus.findMany({
    where: { teamMemberId },
    include: includeRelations,
    orderBy: { teamMemberBonusId: 'asc' },
  });
  return results.map(toDTO);
}

export async function createTeamMemberBonus(
  payload: Prisma.TeamMemberBonusUncheckedCreateInput,
): Promise<TeamMemberBonusDTO> {
  const result = await prisma.teamMemberBonus.create({
    data: payload,
    include: includeRelations,
  });
  return toDTO(result);
}

export async function updateTeamMemberBonus(
  id: number,
  payload: Prisma.TeamMemberBonusUncheckedUpdateInput,
): Promise<TeamMemberBonusDTO> {
  const result = await prisma.teamMemberBonus.update({
    where: { teamMemberBonusId: id },
    data: payload,
    include: includeRelations,
  });
  return toDTO(result);
}

export async function deleteTeamMemberBonus(id: number): Promise<void> {
  await prisma.teamMemberBonus.delete({
    where: { teamMemberBonusId: id },
  });
}

/**
 * Returns date ranges for a team member + category combination,
 * optionally excluding one record (used during update to exclude self).
 */
export async function getBonusesForOverlapCheck(
  teamMemberId: number,
  bonusCategoryId: number,
  excludeId?: number,
): Promise<Array<{ bonusStartDate: Date | null; bonusEndDate: Date | null }>> {
  return prisma.teamMemberBonus.findMany({
    where: {
      teamMemberId,
      bonusCategoryId,
      ...(excludeId !== undefined && { teamMemberBonusId: { not: excludeId } }),
    },
    select: { bonusStartDate: true, bonusEndDate: true },
  });
}

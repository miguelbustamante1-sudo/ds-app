/**
 * Team Member Bonus Repository
 * Database access layer for ds.tmb_team_member_bonus
 */

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

export async function getAllTeamMemberBonuses(): Promise<TeamMemberBonusDTO[]> {
  const results = await prisma.teamMemberBonus.findMany({
    include: includeRelations,
    orderBy: { teamMemberBonusId: 'asc' },
  });
  return results as unknown as TeamMemberBonusDTO[];
}

export async function getTeamMemberBonusById(id: number): Promise<TeamMemberBonusDTO | null> {
  const result = await prisma.teamMemberBonus.findUnique({
    where: { teamMemberBonusId: id },
    include: includeRelations,
  });
  return result as unknown as TeamMemberBonusDTO | null;
}

export async function getTeamMemberBonusesByMember(
  teamMemberId: number,
): Promise<TeamMemberBonusDTO[]> {
  const results = await prisma.teamMemberBonus.findMany({
    where: { teamMemberId },
    include: includeRelations,
    orderBy: { teamMemberBonusId: 'asc' },
  });
  return results as unknown as TeamMemberBonusDTO[];
}

export async function createTeamMemberBonus(
  payload: Prisma.TeamMemberBonusUncheckedCreateInput,
): Promise<TeamMemberBonusDTO> {
  const result = await prisma.teamMemberBonus.create({
    data: payload,
    include: includeRelations,
  });
  return result as unknown as TeamMemberBonusDTO;
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
  return result as unknown as TeamMemberBonusDTO;
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

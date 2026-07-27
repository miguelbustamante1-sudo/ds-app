/**
 * Returns all currently active team members, for the hiring wizard's
 * "team lead" ComboBox. "Active" mirrors the predicate used elsewhere for
 * active team member listings (no end date, or an end date in the future).
 *
 * Purpose-built for the hiring domain per the team-member query wrapper rule
 * — do not reuse this for other features.
 */

import { prisma } from '../../../db/prisma';
import type { HiringTeamLeadOptionDTO } from '@shared/dto/TeamMember';

export async function getHiringTeamLeadOptions(): Promise<HiringTeamLeadOptionDTO[]> {
  const today = new Date();

  return prisma.teamMember.findMany({
    where: {
      teamMemberStartDate: { lte: today },
      OR: [{ teamMemberEndDate: null }, { teamMemberEndDate: { gte: today } }],
    },
    select: {
      teamMemberId: true,
      teamMemberNames: true,
      teamMemberSurnames: true,
      workdayId: true,
    },
    orderBy: [{ teamMemberSurnames: 'asc' }, { teamMemberNames: 'asc' }],
  });
}

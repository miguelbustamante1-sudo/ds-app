/**
 * Query to find team members with less than 100% total allocation.
 *
 * Only considers assignments where:
 *  - projectAssignmentDeleted = false
 *  - project.projectActive = true
 *  - projectAssignmentEndDate is in the future OR null
 */

import { prisma } from '../../../db/prisma';
import type { AvailableResourceDTO } from '@shared/dto';

export async function getAvailableResources(): Promise<AvailableResourceDTO[]> {
  const today = new Date();

  const teamMembers = await prisma.teamMember.findMany({
    select: {
      teamMemberId: true,
      teamMemberNames: true,
      teamMemberSurnames: true,
      teamMemberKnownAs: true,
      teamMemberSeniority: true,
      countryId: true,
      country: { select: { countryName: true } },
      primaryRole: { select: { roleName: true } },
      projectAssignments: {
        where: {
          projectAssignmentDeleted: false,
          project: { projectActive: true },
          OR: [
            { projectAssignmentEndDate: null },
            { projectAssignmentEndDate: { gt: today } },
          ],
        },
        select: { projectAssignmentAllocation: true },
      },
    },
  });

  return teamMembers
    .map((tm) => ({
      teamMemberId: tm.teamMemberId,
      teamMemberNames: tm.teamMemberNames,
      teamMemberSurnames: tm.teamMemberSurnames,
      teamMemberKnownAs: tm.teamMemberKnownAs,
      teamMemberSeniority: tm.teamMemberSeniority,
      countryId: tm.countryId,
      countryName: tm.country?.countryName ?? null,
      roleName: tm.primaryRole?.roleName ?? null,
      totalAllocation: tm.projectAssignments.reduce(
        (sum, a) => sum + Number(a.projectAssignmentAllocation ?? 0),
        0,
      ),
    }))
    .filter((tm) => tm.totalAllocation < 100);
}

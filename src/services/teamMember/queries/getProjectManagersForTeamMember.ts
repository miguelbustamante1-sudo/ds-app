/**
 * Returns the teamMemberIds of all active Project Managers for a given team member.
 *
 * A PM qualifies when:
 *   - The team member has a non-deleted ProjectAssignment (`projectAssignmentDeleted = false`)
 *   - The joined Project is active (`projectActive = true`)
 *   - Today falls within [projectStartDate, projectEndDate]
 *   - The project has a PM assigned (`projectManagerId` is not null)
 *
 * Deduplication is applied so a PM who manages multiple qualifying projects
 * for the same team member appears only once.
 *
 * Returns [] when there are no qualifying assignments — never throws.
 */

import { prisma } from '../../../db/prisma';

export async function getProjectManagersForTeamMember(
  teamMemberId: number,
): Promise<number[]> {
  const today = new Date();

  const assignments = await prisma.projectAssignment.findMany({
    where: {
      teamMemberId,
      projectAssignmentDeleted: false,
      project: {
        projectActive: true,
        projectManagerId: { not: null },
        projectStartDate: { lte: today },
        projectEndDate: { gte: today },
      },
    },
    select: {
      project: {
        select: {
          projectManagerId: true,
        },
      },
    },
  });

  const pmIds = assignments
    .map((a) => a.project.projectManagerId)
    .filter((id): id is number => id !== null);

  return [...new Set(pmIds)];
}

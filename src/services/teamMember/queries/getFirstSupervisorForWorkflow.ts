import { prisma } from '../../../db/prisma';

/**
 * Returns the direct (depth-1) active supervisor's teamMemberId for the
 * given team member, or null if none is currently assigned.
 * Used exclusively by workflow DYNAMIC/FIRST_SUPERVISOR assignment and
 * escalation resolution.
 */
export async function getFirstSupervisorForWorkflow(teamMemberId: number): Promise<number | null> {
  const today = new Date();

  const assignment = await prisma.supervisorAssignment.findFirst({
    where: {
      teamMemberId,
      supervisorAssignmentStartDate: { lte: today },
      OR: [
        { supervisorAssignmentEndDate: null },
        { supervisorAssignmentEndDate: { gte: today } },
      ],
    },
    select: { supervisorId: true },
  });

  return assignment?.supervisorId ?? null;
}

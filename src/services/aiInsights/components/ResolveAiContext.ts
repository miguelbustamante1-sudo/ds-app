import { getReportsForAiContext } from '../../teamMember/queries/getReportsForAiContext';
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { AiToolContext } from '../types';

/**
 * Builds the AiToolContext from req.user fields.
 * isSupervisor uses the same getReports check as GET /api/team-members/is-supervisor
 * — never trusted from the client.
 */
export async function resolveAiContext(
  teamMemberId: number | undefined,
  dsUserId: number | undefined
): Promise<AiToolContext> {
  if (!teamMemberId) throw new AppError('Unauthenticated', 401);
  if (!dsUserId) throw new AppError('Unauthenticated', 401);

  const [reports, teamMember] = await Promise.all([
    getReportsForAiContext(teamMemberId),
    prisma.teamMember.findUnique({
      where: { teamMemberId },
      select: { teamMemberNames: true, teamMemberSurnames: true },
    }),
  ]);

  if (!teamMember) throw new AppError('Team member not found', 404);

  return {
    teamMemberId,
    supervisorTeamMemberId: teamMemberId,
    isSupervisor: reports.length > 0,
    fullName: `${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`,
  };
}

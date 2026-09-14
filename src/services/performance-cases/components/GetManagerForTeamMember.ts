import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { getL1ManagerByWorkdayId } from '../../teamMember/queries/getL1ManagerByWorkdayId';
import type { PerformanceCaseManagerDTO } from '@shared/dto';

export async function getManagerForTeamMember(teamMemberId: number): Promise<PerformanceCaseManagerDTO> {
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: { workdayId: true },
  });
  if (!teamMember) throw new AppError('Team member not found', 404);
  if (!teamMember.workdayId) return { managerName: null, managerEmail: null };
  return getL1ManagerByWorkdayId(teamMember.workdayId);
}

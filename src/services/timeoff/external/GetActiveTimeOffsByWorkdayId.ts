import { prisma } from '../../../db/prisma';
import { getTeamMemberByWorkdayId } from '../../../db/teamMembers';
import type { TimeOffDTO } from '@shared/dto';
import { TeamMemberByWorkdayIdNotFoundError } from './errors';

const EXCLUDED_STATUS_IDS = [4, 5, 6];

export async function getActiveTimeOffsByWorkdayId(workdayId: string): Promise<TimeOffDTO[]> {
  const teamMember = await getTeamMemberByWorkdayId(workdayId);
  if (!teamMember) {
    throw new TeamMemberByWorkdayIdNotFoundError(workdayId);
  }

  const rows = await prisma.timeOff.findMany({
    where: {
      teamMemberId: teamMember.teamMemberId,
      statusId: { notIn: EXCLUDED_STATUS_IDS },
      timeOffEndDate: { gte: new Date() },
    },
    orderBy: { timeOffStartDate: 'asc' },
  });

  return rows.map((row) => ({
    ...row,
    timeOffDays: row.timeOffDays.toNumber(),
  }));
}

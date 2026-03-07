import { prisma } from '../../../db/prisma';
import { getWorkdayInfoById } from '../../../db/workdayInfo';

export interface WorkdayBalanceResult {
  vacation: number;
  personalDays: number;
}

export async function getWorkdayBalance(teamMemberId: number): Promise<WorkdayBalanceResult> {
  const member = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: { workdayId: true },
  });

  if (!member || !member.workdayId) {
    return { vacation: 0, personalDays: 0 };
  }

  const info = await getWorkdayInfoById(member.workdayId);
  if (!info) {
    return { vacation: 0, personalDays: 0 };
  }

  return {
    vacation: info.vacation !== null ? Number(info.vacation) : 0,
    personalDays: info.personalDays !== null ? Number(info.personalDays) : 0,
  };
}

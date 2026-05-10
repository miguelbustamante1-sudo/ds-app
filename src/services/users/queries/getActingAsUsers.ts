import { prisma } from '../../../db/prisma';
import type { ActingAsUserDTO } from '@shared/dto/HolidaySwap';

export async function getActingAsUsers(): Promise<ActingAsUserDTO[]> {
  const users = await prisma.user.findMany({
    where: { teamMemberId: { not: null } },
    select: { userId: true, teamMemberId: true },
    orderBy: { userName: 'asc' },
  });

  const teamMemberIds = users
    .map((u) => u.teamMemberId)
    .filter((id): id is number => id !== null);

  const teamMembers = await prisma.teamMember.findMany({
    where: { teamMemberId: { in: teamMemberIds } },
    select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true, workdayId: true },
  });

  const tmMap = new Map(teamMembers.map((tm) => [tm.teamMemberId, tm]));

  return users
    .filter((u) => u.teamMemberId !== null && tmMap.has(u.teamMemberId!))
    .map((u) => {
      const tm = tmMap.get(u.teamMemberId!)!;
      return {
        userId: u.userId,
        teamMemberId: u.teamMemberId!,
        fullName: `${tm.teamMemberNames} ${tm.teamMemberSurnames}`,
        workdayId: tm.workdayId,
      };
    });
}

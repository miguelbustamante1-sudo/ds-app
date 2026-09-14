import { prisma } from '../../../db/prisma';
import type { PerformanceCaseDTO, PerformanceCaseDisplayDTO } from '@shared/dto';

export async function attachTeamMemberDisplay(cases: PerformanceCaseDTO[]): Promise<PerformanceCaseDisplayDTO[]> {
  const teamMemberIds = [...new Set(cases.map((c) => c.teamMemberId))];
  if (teamMemberIds.length === 0) return [];

  const members = await prisma.teamMember.findMany({
    where: { teamMemberId: { in: teamMemberIds } },
    select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true, workdayId: true },
  });
  const byId = new Map(members.map((m) => [m.teamMemberId, m]));

  return cases.map((c) => {
    const m = byId.get(c.teamMemberId);
    return {
      ...c,
      teamMemberNames: m?.teamMemberNames ?? null,
      teamMemberSurnames: m?.teamMemberSurnames ?? null,
      teamMemberWorkdayId: m?.workdayId ?? null,
    };
  });
}

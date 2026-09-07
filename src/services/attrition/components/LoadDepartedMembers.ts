import { prisma } from '../../../db/prisma';

export interface DepartedMember {
  teamMemberId: number;
  teamMemberEndDate: Date;
}

export async function loadDepartedMembers(today: Date): Promise<DepartedMember[]> {
  const rows = await prisma.teamMember.findMany({
    where: {
      teamMemberEndDate: { lte: today },
    },
    select: {
      teamMemberId: true,
      teamMemberEndDate: true,
    },
  });

  // WHERE lte: today structurally guarantees teamMemberEndDate is non-null
  return rows.filter((r): r is DepartedMember => r.teamMemberEndDate !== null);
}

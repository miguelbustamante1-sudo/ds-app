import { prisma } from '../../../db/prisma';

/** Registered against BusinessReferenceSubjectRegistry for businessReferenceType 'HolidaySwap'. */
export async function getSwapSubjectTeamMember(holidaySwapId: string): Promise<number | null> {
  const id = parseInt(holidaySwapId, 10);
  if (Number.isNaN(id)) return null;

  const swap = await prisma.holidaySwap.findUnique({
    where: { holidaySwapId: id },
    select: { teamMemberId: true },
  });

  return swap?.teamMemberId ?? null;
}

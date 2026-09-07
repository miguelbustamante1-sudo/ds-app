import { prisma } from '../../../db/prisma';

/** Registered against BusinessReferenceSubjectRegistry for businessReferenceType 'TimeOff'. */
export async function getTimeOffSubjectTeamMember(timeOffId: string): Promise<number | null> {
  const id = parseInt(timeOffId, 10);
  if (Number.isNaN(id)) return null;

  const timeOff = await prisma.timeOff.findUnique({
    where: { timeOffId: id },
    select: { teamMemberId: true },
  });

  return timeOff?.teamMemberId ?? null;
}

import { prisma } from '../../../db/prisma';
import type { ApprovedNominationDTO } from '@shared/dto/TpVoting';

export async function getApprovedNominations(
  cycId: number,
  excludeNomineeId: number | null
): Promise<ApprovedNominationDTO[]> {
  return prisma.tpNomination.findMany({
    where: {
      cycId,
      nomStatus: 'SUBMITTED',
      nomAnonymizationStatus: 'APPROVED',
      ...(excludeNomineeId !== null ? { nomNomineeId: { not: excludeNomineeId } } : {}),
    },
    select: {
      nomId: true,
      nomType: true,
      nomAnonymizedText: true,
      nomIsVozDelCliente: true,
    },
  }) as Promise<ApprovedNominationDTO[]>;
}

export async function hasVoted(cycId: number, voterTeamMemberId: number): Promise<boolean> {
  const vote = await prisma.tpVote.findUnique({
    where: { cycId_votVoterId: { cycId, votVoterId: voterTeamMemberId } },
    select: { votId: true },
  });
  return !!vote;
}

import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { AppError } from '../../../errors/AppError';
import { resolveMultiplier } from './multiplierService';
import { hasVoted } from './votingQueries';
import type { TpCycleStatus } from '@shared/dto/TopPerformersCycle';

const RANK_POINTS: Record<number, number> = { 1: 10, 2: 8, 3: 6, 4: 4, 5: 2 };

export interface VoteItemInput {
  nomId: number;
  rank: number;
}

export interface SubmitVoteInput {
  cycId: number;
  voterTeamMemberId: number;
  items: VoteItemInput[];
  createdBy: number;
  userEmail: string;
}

export async function submitVote(input: SubmitVoteInput): Promise<void> {
  if (input.items.length > 5) throw new AppError('Maximum 5 ranked items allowed', 400);

  const ranks = input.items.map((i) => i.rank);
  if (ranks.some((r) => r < 1 || r > 5 || !Number.isInteger(r))) {
    throw new AppError('Ranks must be integers between 1 and 5', 400);
  }
  if (new Set(ranks).size !== ranks.length) {
    throw new AppError('Duplicate ranks are not allowed', 400);
  }

  const uniqueNominations = new Set(input.items.map((i) => i.nomId));
  if (uniqueNominations.size !== input.items.length) throw new AppError('Each voted nomination must be unique', 400);

  const cycle = await prisma.tpCycle.findUnique({ where: { cycId: input.cycId }, select: { cycStatus: true } });
  if (!cycle) throw new AppError('Cycle not found', 404);
  if ((cycle.cycStatus as TpCycleStatus) !== 'VOTING_OPEN') throw new AppError('Voting is not currently open', 400);

  if (await hasVoted(input.cycId, input.voterTeamMemberId)) {
    throw new AppError('You have already voted in this cycle', 409);
  }

  const nominationIds = input.items.map((i) => i.nomId);
  const nominations = await prisma.tpNomination.findMany({
    where: { nomId: { in: nominationIds }, cycId: input.cycId },
    select: { nomId: true, nomNomineeId: true, nomAnonymizationStatus: true },
  });

  if (nominations.length !== input.items.length) throw new AppError('One or more nominations not found or not in this cycle', 400);

  if (nominations.some((n) => n.nomNomineeId === input.voterTeamMemberId)) {
    throw new AppError('Cannot vote for your own nomination', 400);
  }

  const unapproved = nominations.filter((n) => n.nomAnonymizationStatus !== 'APPROVED');
  if (unapproved.length > 0) throw new AppError('Cannot vote on unapproved nominations', 400);

  const nomineeById: Record<number, number> = {};
  for (const n of nominations) nomineeById[n.nomId] = n.nomNomineeId;

  const itemsWithPoints = await Promise.all(
    input.items.map(async (item) => {
      const nomineeId = nomineeById[item.nomId];
      if (nomineeId === undefined) throw new Error(`Nominee not found for nomId ${item.nomId}`);
      const { multiplier } = await resolveMultiplier(input.voterTeamMemberId, nomineeId);
      const rawPoints = RANK_POINTS[item.rank] ?? 0;
      const weightedPoints = parseFloat((rawPoints * multiplier).toFixed(2));
      return { nomId: item.nomId, rank: item.rank, rawPoints, multiplier, weightedPoints };
    })
  );

  const vote = await prisma.$transaction(async (tx) => {
    return tx.tpVote.create({
      data: {
        cycId: input.cycId,
        votVoterId: input.voterTeamMemberId,
        votSubmittedAt: new Date(),
        votCreatedBy: input.createdBy,
        items: {
          create: itemsWithPoints.map((item) => ({
            nomId: item.nomId,
            vtiRank: item.rank,
            vtiRawPoints: item.rawPoints,
            vtiMultiplier: item.multiplier,
            vtiWeightedPoints: item.weightedPoints,
          })),
        },
      },
      select: { votId: true },
    });
  });

  await auditOrchestrator.log({
    entityName: 'vot_votes',
    entityId: String(vote.votId),
    createdBy: input.userEmail,
    oldValues: null,
    newValues: { votId: vote.votId, cycId: input.cycId, voterTeamMemberId: input.voterTeamMemberId } as Record<string, unknown>,
    comment: `Vote submitted for cycle ${input.cycId}`,
  });
}

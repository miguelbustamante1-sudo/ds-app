import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { LeaderboardEntry, CandidateDetail } from '@shared/dto/TpResults';

export function buildLeaderboardCsv(cycId: number, leaderboard: LeaderboardEntry[]): string {
  const header = 'Posición,Nombre,Apellidos,Puntaje Bruto,Puntaje Ponderado,Votos,Nominaciones\n';
  const rows = leaderboard
    .map(
      (e, i) =>
        `${i + 1},"${e.nomineeNames}","${e.nomineeSurnames}",${e.totalRawPoints},${e.totalWeightedPoints},${e.totalVotesReceived},${e.totalNominationsReceived}`
    )
    .join('\n');
  return header + rows;
}

export async function getLeaderboard(cycId: number): Promise<LeaderboardEntry[]> {
  const voteItems = await prisma.tpVoteItem.findMany({
    where: { vote: { cycId } },
    include: {
      nomination: {
        include: { nominee: { select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true } } },
      },
    },
  });

  const byNominee = new Map<
    number,
    { nominee: { teamMemberId: number; teamMemberNames: string; teamMemberSurnames: string }; rawPoints: number; weightedPoints: number; voteCount: number }
  >();

  for (const item of voteItems) {
    const nomineeId = item.nomination.nomNomineeId;
    const existing = byNominee.get(nomineeId);
    if (existing) {
      existing.rawPoints += item.vtiRawPoints;
      existing.weightedPoints += Number(item.vtiWeightedPoints);
      existing.voteCount += 1;
    } else {
      byNominee.set(nomineeId, {
        nominee: item.nomination.nominee,
        rawPoints: item.vtiRawPoints,
        weightedPoints: Number(item.vtiWeightedPoints),
        voteCount: 1,
      });
    }
  }

  const nominationCounts = await prisma.tpNomination.groupBy({
    by: ['nomNomineeId'],
    where: { cycId, nomStatus: 'SUBMITTED' },
    _count: true,
  });
  const nomCountById: Record<number, number> = {};
  for (const n of nominationCounts) nomCountById[n.nomNomineeId] = n._count;

  const entries: LeaderboardEntry[] = Array.from(byNominee.entries()).map(([nomineeId, data]) => ({
    nomineeId,
    nomineeNames: data.nominee.teamMemberNames,
    nomineeSurnames: data.nominee.teamMemberSurnames,
    teamName: null,
    totalRawPoints: data.rawPoints,
    totalWeightedPoints: parseFloat(data.weightedPoints.toFixed(2)),
    totalVotesReceived: data.voteCount,
    totalNominationsReceived: nomCountById[nomineeId] ?? 0,
  }));

  return entries.sort((a, b) => b.totalWeightedPoints - a.totalWeightedPoints);
}

export async function getCandidateDetail(cycId: number, nomineeId: number): Promise<CandidateDetail> {
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId: nomineeId },
    select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true },
  });
  if (!teamMember) throw new AppError('Team member not found', 404);

  const nominations = await prisma.tpNomination.findMany({
    where: { cycId, nomNomineeId: nomineeId, nomStatus: 'SUBMITTED' },
    include: {
      metrics: { select: { nmeMetricName: true, nmeMetricValue: true, nmeMetricBenchmark: true }, orderBy: { nmeSortOrder: 'asc' } },
    },
  });

  const voteItems = await prisma.tpVoteItem.findMany({
    where: { nomination: { cycId, nomNomineeId: nomineeId } },
    include: { vote: { select: { votVoterId: true } } },
  });

  const rankDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const item of voteItems) {
    rankDistribution[item.vtiRank] = (rankDistribution[item.vtiRank] ?? 0) + 1;
  }

  return {
    nomineeId,
    nomineeNames: teamMember.teamMemberNames,
    nomineeSurnames: teamMember.teamMemberSurnames,
    nominations: nominations.map((n) => ({
      nomId: n.nomId,
      nomType: n.nomType,
      nomAchievementText: n.nomAchievementText,
      nomAdminExceedsRole: n.nomAdminExceedsRole,
      nomAdminClientImpact: n.nomAdminClientImpact,
      nomAdminConfidenceLevel: n.nomAdminConfidenceLevel,
      nomIsVozDelCliente: n.nomIsVozDelCliente,
      metrics: n.metrics,
    })),
    voteBreakdown: voteItems.map((item) => ({
      rank: item.vtiRank,
      rawPoints: item.vtiRawPoints,
      multiplier: Number(item.vtiMultiplier),
      weightedPoints: Number(item.vtiWeightedPoints),
      voterTeamMemberId: item.vote.votVoterId,
    })),
    rankDistribution,
  };
}

import { prisma } from '../../../db/prisma';
import { getReportsForPerformanceReview } from '../../teamMember/queries/getReportsForPerformanceReview';
import { getManagerView } from './GetManagerView';

export interface PortfolioSummary {
  countByTier: Record<string, number>;
  countByPhase: Record<string, number>;
  atRiskCaseIds: number[];
  atRiskCases: { caseId: number; caseCode: string }[];
  tlStrikeCounts: { teamLeaderId: number; teamLeaderName: string; strikeCount: number }[];
}

export async function getPortfolioSummary(requestingTeamMemberId: number): Promise<PortfolioSummary> {
  const inScopeIds = [requestingTeamMemberId, ...(await getReportsForPerformanceReview(requestingTeamMemberId))];
  const rows = await getManagerView(requestingTeamMemberId);

  const countByTier: Record<string, number> = {};
  const countByPhase: Record<string, number> = {};
  const atRiskCaseIds: number[] = [];
  const atRiskCases: { caseId: number; caseCode: string }[] = [];

  for (const row of rows) {
    countByTier[row.severityTier] = (countByTier[row.severityTier] ?? 0) + 1;
    countByPhase[row.currentPhase] = (countByPhase[row.currentPhase] ?? 0) + 1;
    if (row.isEtaOverdue || row.hasMissingManagerFeedback) {
      atRiskCaseIds.push(row.caseId);
      atRiskCases.push({ caseId: row.caseId, caseCode: row.caseCode });
    }
  }

  const teamLeaders = await prisma.teamMember.findMany({
    where: { teamMemberId: { in: inScopeIds } },
    select: { teamMemberId: true, performanceStrikeCount: true, teamMemberNames: true, teamMemberSurnames: true },
  });
  const tlStrikeCounts = teamLeaders
    .filter((t) => t.performanceStrikeCount > 0)
    .map((t) => ({
      teamLeaderId: t.teamMemberId,
      teamLeaderName: `${t.teamMemberNames} ${t.teamMemberSurnames}`,
      strikeCount: t.performanceStrikeCount,
    }));

  return { countByTier, countByPhase, atRiskCaseIds, atRiskCases, tlStrikeCounts };
}

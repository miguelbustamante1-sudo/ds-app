import { prisma } from '../../../db/prisma';
import { getReportsForPerformanceReview } from '../../teamMember/queries/getReportsForPerformanceReview';

export interface ManagerViewRow {
  caseId: number;
  caseCode: string;
  teamMemberId: number;
  teamMemberName: string | null;
  teamLeaderId: number;
  severityTier: string;
  currentPhase: string;
  caseStatus: string;
  nextEtaDate: string | null;
  isEtaOverdue: boolean;
  hasMissingManagerFeedback: boolean;
}

export async function getManagerView(requestingTeamMemberId: number): Promise<ManagerViewRow[]> {
  const inScopeIds = [requestingTeamMemberId, ...(await getReportsForPerformanceReview(requestingTeamMemberId))];

  const cases = await prisma.performanceCase.findMany({
    where: { teamLeaderId: { in: inScopeIds }, caseStatus: 'ACTIVE' },
    include: {
      phases: { where: { status: 'IN_PROGRESS' }, take: 1 },
      checkIns: { orderBy: { checkInDate: 'desc' }, take: 1 },
    },
  });

  const teamMemberIds = [...new Set(cases.map((c) => c.teamMemberId))];
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamMemberId: { in: teamMemberIds } },
    select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true },
  });
  const nameById = new Map(teamMembers.map((t) => [t.teamMemberId, `${t.teamMemberNames} ${t.teamMemberSurnames}`]));

  const now = new Date();
  return cases.map((c) => {
    const currentPhaseRow = c.phases[0];
    const lastCheckIn = c.checkIns[0];
    return {
      caseId: c.caseId,
      caseCode: c.caseCode,
      teamMemberId: c.teamMemberId,
      teamMemberName: nameById.get(c.teamMemberId) ?? null,
      teamLeaderId: c.teamLeaderId,
      severityTier: c.severityTier,
      currentPhase: c.currentPhase,
      caseStatus: c.caseStatus,
      nextEtaDate: currentPhaseRow?.etaDate?.toISOString() ?? null,
      isEtaOverdue: Boolean(currentPhaseRow?.etaDate && currentPhaseRow.etaDate < now),
      hasMissingManagerFeedback: lastCheckIn ? !lastCheckIn.managerFeedbackReceived : false,
    };
  });
}

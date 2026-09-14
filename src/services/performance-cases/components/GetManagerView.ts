import { prisma } from '../../../db/prisma';
import { getReportsForPerformanceReview } from '../../teamMember/queries/getReportsForPerformanceReview';

export interface ManagerViewRow {
  caseId: number;
  caseCode: string;
  caseLabel: string | null;
  teamMemberId: number;
  teamMemberNames: string | null;
  teamMemberSurnames: string | null;
  teamMemberWorkdayId: string | null;
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
    select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true, workdayId: true },
  });
  const memberById = new Map(teamMembers.map((t) => [t.teamMemberId, t]));

  const now = new Date();
  return cases.map((c) => {
    const currentPhaseRow = c.phases[0];
    const lastCheckIn = c.checkIns[0];
    const member = memberById.get(c.teamMemberId);
    return {
      caseId: c.caseId,
      caseCode: c.caseCode,
      caseLabel: c.caseLabel,
      teamMemberId: c.teamMemberId,
      teamMemberNames: member?.teamMemberNames ?? null,
      teamMemberSurnames: member?.teamMemberSurnames ?? null,
      teamMemberWorkdayId: member?.workdayId ?? null,
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

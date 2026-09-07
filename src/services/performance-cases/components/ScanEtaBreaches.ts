import { prisma } from '../../../db/prisma';
import { resolveCaseStakeholders } from './ResolveCaseStakeholders';
import { sendCaseNotification } from './SendCaseNotification';

// Marker field on pcp_fields to avoid re-notifying/re-incrementing on every scan run for the same breach.
const BREACH_FLAGGED_KEY = '_etaBreachFlagged';

export async function scanEtaBreaches(): Promise<{ breachesFound: number }> {
  const now = new Date();
  const breachedPhases = await prisma.performanceCasePhase.findMany({
    where: { status: 'IN_PROGRESS', etaDate: { lt: now } },
    include: { case: true },
  });

  let breachesFound = 0;
  for (const phaseRow of breachedPhases) {
    const fields = phaseRow.fields as Record<string, unknown>;
    if (fields[BREACH_FLAGGED_KEY]) continue;

    await prisma.$transaction([
      prisma.performanceCasePhase.update({
        where: { phasePkId: phaseRow.phasePkId },
        data: { fields: { ...fields, [BREACH_FLAGGED_KEY]: true } },
      }),
      prisma.teamMember.update({
        where: { teamMemberId: phaseRow.case.teamLeaderId },
        data: { performanceStrikeCount: { increment: 1 } },
      }),
    ]);

    const stakeholders = await resolveCaseStakeholders(phaseRow.caseId);
    if (stakeholders.omId) {
      await sendCaseNotification({
        caseId: phaseRow.caseId,
        caseCode: phaseRow.case.caseCode,
        title: `ETA breach — ${phaseRow.phase}`,
        message: `The ETA for ${phaseRow.phase} has passed without completion.`,
        recipientTeamMemberIds: [stakeholders.omId],
        stakeholders,
      });
    }
    breachesFound += 1;
  }
  return { breachesFound };
}

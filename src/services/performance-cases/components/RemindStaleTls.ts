import { prisma } from '../../../db/prisma';
import { resolveCaseStakeholders } from './ResolveCaseStakeholders';
import { sendCaseNotification } from './SendCaseNotification';

const STALE_DAYS = 10;

export async function remindStaleTls(): Promise<{ remindersSent: number }> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - STALE_DAYS);

  const activeCases = await prisma.performanceCase.findMany({
    where: { caseStatus: 'ACTIVE', currentPhase: 'PHASE_5' },
    include: { checkIns: { orderBy: { checkInDate: 'desc' }, take: 1 } },
  });

  let remindersSent = 0;
  for (const perfCase of activeCases) {
    const lastCheckIn = perfCase.checkIns[0]?.checkInDate ?? perfCase.createdDate;
    if (lastCheckIn < threshold) {
      const stakeholders = await resolveCaseStakeholders(perfCase.caseId);
      await sendCaseNotification({
        caseId: perfCase.caseId,
        caseCode: perfCase.caseCode,
        title: 'No update logged in 10 days',
        message: `Case ${perfCase.caseCode} has had no logged update in over ${STALE_DAYS} days.`,
        recipientTeamMemberIds: [perfCase.teamLeaderId],
        stakeholders,
      });
      remindersSent += 1;
    }
  }
  return { remindersSent };
}

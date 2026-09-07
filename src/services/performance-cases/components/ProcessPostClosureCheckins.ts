import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { spawnPhaseTask } from './SpawnPhaseTask';
import { spawnRegressionCase } from './SpawnRegressionCase';
import { resolveCaseStakeholders } from './ResolveCaseStakeholders';
import { sendCaseNotification } from './SendCaseNotification';
import type { PerformanceSeverityTier } from '@shared/dto';

// This job runs from an unauthenticated scheduled context (no req.user) — mutations it makes
// (StandaloneTask creation, regression case creation) still need a real `ds.tbl_users.usr_id`
// for their createdBy/actingUserId FK, so it acts as the same service account already used by
// `validateApiKey` for machine-to-machine calls (see src/middleware/apiKey.ts), rather than
// inventing a placeholder identity.
const SERVICE_ACCOUNT_EMAIL = 'api-service@internal';

function resolveServiceActingUser(): { actingUserId: number; actingUserEmail: string } {
  const actingUserId = Number(process.env.API_SERVICE_ACCOUNT_DS_USER_ID);
  if (!actingUserId) throw new AppError('API_SERVICE_ACCOUNT_DS_USER_ID is not configured', 500);
  return { actingUserId, actingUserEmail: SERVICE_ACCOUNT_EMAIL };
}

export async function processPostClosureCheckins(): Promise<{
  remindersCreated: number;
  regressionsSpawned: number;
}> {
  const { actingUserId, actingUserEmail } = resolveServiceActingUser();
  const now = new Date();
  const due = await prisma.performanceCasePostClosureCheckin.findMany({
    where: { status: null, dueDate: { lte: now } },
    include: { case: true },
  });

  let remindersCreated = 0;
  for (const checkin of due) {
    await spawnPhaseTask(
      checkin.caseId,
      checkin.case.caseCode,
      'POST_CLOSURE',
      checkin.case.teamLeaderId,
      checkin.dueDate,
      actingUserId,
      actingUserEmail,
    );
    // Mark as reminded so the next scan doesn't re-spawn a duplicate reminder task for the
    // same checkpoint every run; a future check-in review corrects this to AT_RISK/REGRESSION.
    await prisma.performanceCasePostClosureCheckin.update({
      where: { checkinId: checkin.checkinId },
      data: { status: 'ON_TRACK', checkedDate: now },
    });
    remindersCreated += 1;
  }

  const regressed = await prisma.performanceCasePostClosureCheckin.findMany({
    where: { status: 'REGRESSION' },
    include: { case: true },
  });

  let regressionsSpawned = 0;
  for (const checkin of regressed) {
    if (checkin.case.caseStatus === 'REGRESSED') continue; // already spawned
    await spawnRegressionCase(
      checkin.caseId,
      checkin.case.severityTier as PerformanceSeverityTier,
      actingUserId,
      actingUserEmail,
    );
    const stakeholders = await resolveCaseStakeholders(checkin.caseId);
    await sendCaseNotification({
      caseId: checkin.caseId,
      caseCode: checkin.case.caseCode,
      title: 'Regression detected at post-closure checkpoint',
      message: `${checkin.checkpoint} checkpoint flagged as regression.`,
      recipientTeamMemberIds: [stakeholders.omId, stakeholders.agmId].filter((id): id is number => id != null),
      stakeholders,
    });
    regressionsSpawned += 1;
  }

  return { remindersCreated, regressionsSpawned };
}

import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { computeNextCheckInDate } from '../rcaFrequencyTable';
import { spawnPhaseTask } from './SpawnPhaseTask';
import { resolveCaseStakeholders } from './ResolveCaseStakeholders';
import { sendCaseNotification } from './SendCaseNotification';
import { toPerformanceCaseCheckInDTO } from '../mappers';
import type { CreateCheckInDTO, PerformanceCaseCheckInDTO, PerformanceRcaType } from '@shared/dto';

export async function createCheckIn(
  caseId: number,
  input: CreateCheckInDTO,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCaseCheckInDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);
  if (perfCase.currentPhase !== 'PHASE_5') {
    throw new AppError('Check-ins can only be logged during Phase 5', 400);
  }
  if (!perfCase.rcaType) {
    throw new AppError('Case has no rcaType set — cannot compute next check-in cadence', 400);
  }

  const created = await prisma.performanceCaseCheckIn.create({
    data: {
      caseId,
      checkInDate: new Date(input.checkInDate),
      tmUpdate: input.tmUpdate,
      managerFeedbackReceived: input.managerFeedbackReceived,
      status: input.status,
      createdBy: actingUserId,
    },
  });

  const nextDate = computeNextCheckInDate(
    created.checkInDate,
    perfCase.rcaType as PerformanceRcaType,
    perfCase.severityTier === 'CRITICAL',
  );
  await spawnPhaseTask(
    caseId,
    perfCase.caseCode,
    'PHASE_5',
    perfCase.teamLeaderId,
    nextDate,
    actingUserId,
    actingUserEmail,
  );

  await auditOrchestrator.log({
    entityName: 'pmc_case_checkins',
    entityId: String(created.checkInId),
    createdBy: actingUserEmail,
    oldValues: null,
    newValues: created as unknown as Record<string, unknown>,
  });

  const stakeholders = await resolveCaseStakeholders(caseId);
  await sendCaseNotification({
    caseId,
    caseCode: perfCase.caseCode,
    title: 'Performance case check-in logged',
    message: `Status: ${input.status}.`,
    recipientTeamMemberIds: [stakeholders.omId, stakeholders.agmId].filter((id): id is number => id != null),
    notifyManager: true,
    stakeholders,
  });

  const recentCheckIns = await prisma.performanceCaseCheckIn.findMany({
    where: { caseId },
    orderBy: { checkInDate: 'desc' },
    take: 2,
  });
  if (recentCheckIns.length === 2 && recentCheckIns.every((c) => !c.managerFeedbackReceived) && stakeholders.agmId) {
    await sendCaseNotification({
      caseId,
      caseCode: perfCase.caseCode,
      title: 'Manager feedback missing 2 consecutive intervals',
      message: 'Escalating — manager has not provided feedback for two consecutive check-ins.',
      recipientTeamMemberIds: [stakeholders.agmId],
      notifyManager: true,
      stakeholders,
    });
  }
  if (recentCheckIns.length === 2 && recentCheckIns.every((c) => c.status === 'NO_PROGRESS') && stakeholders.omId) {
    await sendCaseNotification({
      caseId,
      caseCode: perfCase.caseCode,
      title: 'No progress for 2 consecutive check-ins',
      message: 'Plan review recommended — no measurable progress across the last two check-ins.',
      recipientTeamMemberIds: [stakeholders.omId],
      stakeholders,
    });
  }

  return toPerformanceCaseCheckInDTO(created);
}

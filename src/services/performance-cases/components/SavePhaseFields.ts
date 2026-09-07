import { prisma } from '../../../db/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { resolveCaseStakeholders } from './ResolveCaseStakeholders';
import { sendCaseNotification } from './SendCaseNotification';
import { writeWorkdayOutboxEntry } from './WriteWorkdayOutboxEntry';
import { syncRcaTypeFromFields } from './SyncRcaTypeFromFields';
import { toPerformanceCasePhaseDTO } from '../mappers';
import type { PerformanceCasePhaseDTO, PerformanceCasePhaseName } from '@shared/dto';

export async function savePhaseFields(
  caseId: number,
  fields: Record<string, unknown>,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCasePhaseDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);

  // pmc_current_phase is a plain VARCHAR column (CHECK-constrained, not a native Prisma enum) —
  // the compound-unique lookup takes a bare string, no cast needed (see AdvancePhase.ts).
  const currentPhaseRow = await prisma.performanceCasePhase.findUnique({
    where: { caseId_phase: { caseId, phase: perfCase.currentPhase } },
  });
  if (!currentPhaseRow) throw new AppError('Current phase record not found', 500);

  const priorFields = currentPhaseRow.fields as Record<string, unknown>;
  const mergedFields = { ...priorFields, ...fields };

  await syncRcaTypeFromFields(caseId, perfCase.currentPhase as PerformanceCasePhaseName, mergedFields);

  const updated = await prisma.performanceCasePhase.update({
    where: { phasePkId: currentPhaseRow.phasePkId },
    data: { fields: mergedFields as unknown as Prisma.InputJsonValue },
  });

  await auditOrchestrator.log({
    entityName: 'pmc_performance_cases',
    entityId: String(caseId),
    createdBy: actingUserEmail,
    oldValues: { fields: priorFields } as unknown as Record<string, unknown>,
    newValues: { fields: mergedFields } as unknown as Record<string, unknown>,
    comment: `Phase fields saved for ${perfCase.currentPhase}`,
  });

  const stakeholders = await resolveCaseStakeholders(caseId);

  if (perfCase.currentPhase === 'PHASE_2' && !priorFields.rcaDocument && mergedFields.rcaDocument && stakeholders.omId) {
    await sendCaseNotification({
      caseId,
      caseCode: perfCase.caseCode,
      title: 'RCA ready for review',
      message: 'The RCA document is ready for your review and sign-off.',
      recipientTeamMemberIds: [stakeholders.omId],
      stakeholders,
    });
  }

  if (perfCase.currentPhase === 'PHASE_4' && !priorFields.tmAcceptanceDate && mergedFields.tmAcceptanceDate) {
    await sendCaseNotification({
      caseId,
      caseCode: perfCase.caseCode,
      title: 'Performance plan activated',
      message: 'The team member has accepted the performance plan.',
      recipientTeamMemberIds: [stakeholders.omId, stakeholders.agmId].filter((id): id is number => id != null),
      notifyManager: true,
      stakeholders,
    });

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamMemberId: perfCase.teamMemberId },
      select: { workdayId: true },
    });
    if (teamMember?.workdayId) {
      await writeWorkdayOutboxEntry(caseId, teamMember.workdayId, 'PLAN_ACTIVATED', {
        areasOfConcern: mergedFields.areasOfConcern ?? null,
        improvementGoals: mergedFields.improvementGoals ?? null,
        goalActivities: mergedFields.goalActivities ?? null,
        startDate: mergedFields.planStartDate ?? null,
        endDate: mergedFields.planEndDate ?? null,
      });
    }
  }

  return toPerformanceCasePhaseDTO(updated);
}

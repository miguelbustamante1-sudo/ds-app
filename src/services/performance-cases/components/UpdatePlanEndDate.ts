import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { toPerformanceCasePhaseDTO } from '../mappers';
import { writeWorkdayOutboxEntry } from './WriteWorkdayOutboxEntry';
import type { PerformanceCasePhaseDTO } from '@shared/dto';

export async function updatePlanEndDate(
  caseId: number,
  newEndDate: string,
  changeComment: string,
  hintForSuccessTriggered: boolean,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCasePhaseDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);
  if (!['PHASE_5', 'PHASE_6'].includes(perfCase.currentPhase)) {
    throw new AppError('Plan end date can only change mid-plan (Phase 5 or 6)', 400);
  }

  // pmc_current_phase is a plain VARCHAR column (CHECK-constrained, not a native Prisma enum) —
  // the compound-unique lookup takes a bare string, no cast needed (see AdvancePhase.ts/SavePhaseFields.ts).
  const currentPhaseRow = await prisma.performanceCasePhase.findUnique({
    where: { caseId_phase: { caseId, phase: perfCase.currentPhase } },
  });
  if (!currentPhaseRow) throw new AppError('Current phase record not found', 500);

  const priorFields = currentPhaseRow.fields as Record<string, unknown>;
  const mergedFields = { ...priorFields, planEndDate: newEndDate };

  const updated = await prisma.performanceCasePhase.update({
    where: { phasePkId: currentPhaseRow.phasePkId },
    data: { fields: mergedFields as unknown as Prisma.InputJsonValue },
  });

  await auditOrchestrator.log({
    entityName: 'pmc_case_phases',
    entityId: String(currentPhaseRow.phasePkId),
    createdBy: actingUserEmail,
    oldValues: { planEndDate: priorFields.planEndDate ?? null } as unknown as Record<string, unknown>,
    newValues: { planEndDate: newEndDate } as unknown as Record<string, unknown>,
    comment: changeComment,
  });

  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId: perfCase.teamMemberId },
    select: { workdayId: true },
  });
  if (teamMember?.workdayId) {
    await writeWorkdayOutboxEntry(caseId, teamMember.workdayId, 'MID_PLAN_CHANGE', {
      newEndDate,
      changeComment,
      hintForSuccessTriggered,
    });
  }

  return toPerformanceCasePhaseDTO(updated);
}

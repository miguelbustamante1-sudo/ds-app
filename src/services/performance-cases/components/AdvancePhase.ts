import { prisma } from '../../../db/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { PHASE_REQUIRED_FIELDS, nextPhase } from '../phaseConfig';
import { toPerformanceCaseDTO } from '../mappers';
import { spawnPhaseTask } from './SpawnPhaseTask';
import { syncRcaTypeFromFields } from './SyncRcaTypeFromFields';
import { computePhaseEtaDate } from '../etaTables';
import type { AdvancePhaseDTO, PerformanceCaseDTO, PerformanceCasePhaseName } from '@shared/dto';

export async function advancePhase(
  caseId: number,
  input: AdvancePhaseDTO,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCaseDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);
  if (perfCase.caseStatus !== 'ACTIVE') {
    throw new AppError(`Cannot advance a case with status ${perfCase.caseStatus}`, 400);
  }

  // pmc_current_phase is a plain VARCHAR column (CHECK-constrained at the DB level, not a
  // native Prisma enum) so the compound-unique lookup below takes a bare string — no cast needed.
  const currentPhaseRow = await prisma.performanceCasePhase.findUnique({
    where: { caseId_phase: { caseId, phase: perfCase.currentPhase } },
  });
  if (!currentPhaseRow) throw new AppError('Current phase record not found', 500);

  // Narrow the DB's plain string to the known phase-name union — safe because the CHECK
  // constraint on pmc_current_phase guarantees the value is one of PerformanceCasePhaseName.
  const currentPhase = perfCase.currentPhase as PerformanceCasePhaseName;

  const required = PHASE_REQUIRED_FIELDS[currentPhase];
  const fields = { ...(currentPhaseRow.fields as Record<string, unknown>), ...input.fields };

  await syncRcaTypeFromFields(caseId, currentPhase, fields);

  const missing = required.filter((key) => !fields[key]);
  if (missing.length > 0) {
    throw new AppError(`Missing required output(s) for ${currentPhase}: ${missing.join(', ')}`, 400);
  }

  if (currentPhase === 'PHASE_1' && perfCase.calibrationRequired && !perfCase.calibrationCompletedDate) {
    throw new AppError('Calibration step is required before advancing past Phase 1', 400);
  }
  if (currentPhase === 'PHASE_2' && !perfCase.rcaSignoffBy) {
    throw new AppError('OM RCA sign-off is required before advancing past Phase 2', 400);
  }

  const next = nextPhase(currentPhase);
  if (!next) throw new AppError('Case is already at its final phase', 400);

  const [, updated] = await prisma.$transaction([
    prisma.performanceCasePhase.update({
      where: { phasePkId: currentPhaseRow.phasePkId },
      data: {
        status: 'COMPLETE',
        completedDate: new Date(),
        completedBy: actingUserId,
        fields: fields as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.performanceCase.update({
      where: { caseId },
      data: { currentPhase: next, updatedBy: actingUserId, updatedDate: new Date() },
    }),
  ]);

  const nextStartedDate = new Date();
  const nextEta = computePhaseEtaDate(next, nextStartedDate);
  await prisma.performanceCasePhase.create({
    data: { caseId, phase: next, status: 'IN_PROGRESS', startedDate: nextStartedDate, etaDate: nextEta },
  });
  if (next !== 'PHASE_5') {
    await spawnPhaseTask(
      caseId,
      perfCase.caseCode,
      next,
      perfCase.teamLeaderId,
      nextEta,
      actingUserId,
      actingUserEmail,
    );
  }

  await auditOrchestrator.log({
    entityName: 'pmc_performance_cases',
    entityId: String(caseId),
    createdBy: actingUserEmail,
    oldValues: { currentPhase } as unknown as Record<string, unknown>,
    newValues: { currentPhase: next, rcaType: fields['rcaType'] ?? null } as unknown as Record<string, unknown>,
    comment: `Phase advanced from ${currentPhase} to ${next}`,
  });

  return toPerformanceCaseDTO(updated);
}

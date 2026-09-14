import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { PHASE_REQUIRED_FIELDS } from '../phaseConfig';
import { toPerformanceCasePhaseDTO } from '../mappers';
import { syncRcaTypeFromFields } from './SyncRcaTypeFromFields';
import type { PerformanceCasePhaseDTO, PerformanceCasePhaseName } from '@shared/dto';

/**
 * Edits a phase that has already been completed. Unlike SavePhaseFields (current phase only),
 * this never re-fires phase-entry notifications or Workday outbox entries — those were sent
 * when the phase was first worked. The OM RCA sign-off is also preserved.
 */
export async function saveCompletedPhaseFields(
  caseId: number,
  phase: PerformanceCasePhaseName,
  fields: Record<string, unknown>,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCasePhaseDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);
  if (perfCase.caseStatus !== 'ACTIVE') {
    throw new AppError('Only an active case can be edited', 400);
  }
  if (perfCase.currentPhase === phase) {
    throw new AppError('Use the current-phase save for the phase in progress', 400);
  }

  const row = await prisma.performanceCasePhase.findUnique({ where: { caseId_phase: { caseId, phase } } });
  if (!row || row.status !== 'COMPLETE') {
    throw new AppError('Only a completed phase can be edited', 400);
  }

  const priorFields = row.fields as Record<string, unknown>;
  const mergedFields = { ...priorFields, ...fields };

  const missing = PHASE_REQUIRED_FIELDS[phase].filter((key) => !mergedFields[key]);
  if (missing.length > 0) {
    throw new AppError(`Missing required output(s) for ${phase}: ${missing.join(', ')}`, 400);
  }

  await syncRcaTypeFromFields(caseId, phase, mergedFields);

  const [updated] = await prisma.$transaction([
    prisma.performanceCasePhase.update({
      where: { phasePkId: row.phasePkId },
      data: { fields: mergedFields as unknown as Prisma.InputJsonValue },
    }),
    prisma.performanceCase.update({
      where: { caseId },
      data: { updatedBy: actingUserId, updatedDate: new Date() },
    }),
  ]);

  await auditOrchestrator.log({
    entityName: 'pmc_case_phases',
    entityId: String(row.phasePkId),
    createdBy: actingUserEmail,
    oldValues: { fields: priorFields } as unknown as Record<string, unknown>,
    newValues: { fields: mergedFields } as unknown as Record<string, unknown>,
    comment: `Completed phase ${phase} edited on case ${perfCase.caseCode}`,
  });

  return toPerformanceCasePhaseDTO(updated);
}

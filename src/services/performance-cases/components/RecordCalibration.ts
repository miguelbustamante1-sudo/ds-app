import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { toPerformanceCaseDTO } from '../mappers';
import type { PerformanceCaseDTO } from '@shared/dto';

export async function recordCalibration(
  caseId: number,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCaseDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);
  if (perfCase.currentPhase !== 'PHASE_1') {
    throw new AppError('Calibration can only be recorded during Phase 1', 400);
  }

  const updated = await prisma.performanceCase.update({
    where: { caseId },
    data: { calibrationCompletedDate: new Date(), updatedBy: actingUserId, updatedDate: new Date() },
  });

  await auditOrchestrator.log({
    entityName: 'pmc_performance_cases',
    entityId: String(caseId),
    createdBy: actingUserEmail,
    oldValues: { calibrationCompletedDate: null } as unknown as Record<string, unknown>,
    newValues: { calibrationCompletedDate: updated.calibrationCompletedDate } as unknown as Record<string, unknown>,
  });

  return toPerformanceCaseDTO(updated);
}

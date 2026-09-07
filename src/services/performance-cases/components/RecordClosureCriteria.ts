import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { toPerformanceCaseDTO } from '../mappers';
import type { PerformanceCaseDTO } from '@shared/dto';

export interface ClosureCriteriaInput {
  clientConfirmedImprovement?: boolean;
  clientConfirmedComment?: string;
  metricImprovedVsBaseline?: boolean;
  metricImprovedComment?: string;
  noNewEscalationLast2Weeks?: boolean;
  noNewEscalationComment?: string;
}

export async function recordClosureCriteria(
  caseId: number,
  input: ClosureCriteriaInput,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCaseDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);
  if (perfCase.currentPhase !== 'PHASE_6') {
    throw new AppError('Closure criteria can only be recorded during Phase 6', 400);
  }

  const updated = await prisma.performanceCase.update({
    where: { caseId },
    data: {
      clientConfirmedImprovement: input.clientConfirmedImprovement ?? perfCase.clientConfirmedImprovement,
      clientConfirmedComment: input.clientConfirmedComment ?? perfCase.clientConfirmedComment,
      metricImprovedVsBaseline: input.metricImprovedVsBaseline ?? perfCase.metricImprovedVsBaseline,
      metricImprovedComment: input.metricImprovedComment ?? perfCase.metricImprovedComment,
      noNewEscalationLast2Weeks: input.noNewEscalationLast2Weeks ?? perfCase.noNewEscalationLast2Weeks,
      noNewEscalationComment: input.noNewEscalationComment ?? perfCase.noNewEscalationComment,
      updatedBy: actingUserId,
      updatedDate: new Date(),
    },
  });

  await auditOrchestrator.log({
    entityName: 'pmc_performance_cases',
    entityId: String(caseId),
    createdBy: actingUserEmail,
    oldValues: perfCase as unknown as Record<string, unknown>,
    newValues: updated as unknown as Record<string, unknown>,
  });

  return toPerformanceCaseDTO(updated);
}

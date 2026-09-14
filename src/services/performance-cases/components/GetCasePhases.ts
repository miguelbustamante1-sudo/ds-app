import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { PHASE_ORDER } from '../phaseConfig';
import { toPerformanceCasePhaseDTO } from '../mappers';
import type { PerformanceCasePhaseDTO } from '@shared/dto';

export async function getCasePhases(caseId: number): Promise<PerformanceCasePhaseDTO[]> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId }, select: { caseId: true } });
  if (!perfCase) throw new AppError('Case not found', 404);

  const rows = await prisma.performanceCasePhase.findMany({ where: { caseId } });
  return rows
    .map(toPerformanceCasePhaseDTO)
    .sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase));
}

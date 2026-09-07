import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { toPerformanceCaseDTO } from '../mappers';
import type { PerformanceCaseDTO } from '@shared/dto';

export async function getCase(caseId: number): Promise<PerformanceCaseDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);
  return toPerformanceCaseDTO(perfCase);
}

import { prisma } from '../../../db/prisma';
import { toPerformanceCaseDTO } from '../mappers';
import type { PerformanceCaseDTO } from '@shared/dto';

export async function getAllCases(): Promise<PerformanceCaseDTO[]> {
  const cases = await prisma.performanceCase.findMany({ orderBy: { createdDate: 'desc' } });
  return cases.map(toPerformanceCaseDTO);
}

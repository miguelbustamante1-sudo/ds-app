import { prisma } from '../../../db/prisma';
import { toPerformanceCaseDTO } from '../mappers';
import { resolveCaseScopeWhere } from './ResolveCaseAccess';
import type { CaseActor } from './ResolveCaseAccess';
import type { PerformanceCaseDTO } from '@shared/dto';

export async function getAllCases(actor: CaseActor): Promise<PerformanceCaseDTO[]> {
  const where = await resolveCaseScopeWhere(actor);
  const cases = await prisma.performanceCase.findMany({ where, orderBy: { createdDate: 'desc' } });
  return cases.map(toPerformanceCaseDTO);
}

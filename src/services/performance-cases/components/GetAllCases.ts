import { prisma } from '../../../db/prisma';
import { toPerformanceCaseDTO } from '../mappers';
import { resolveCaseScopeWhere } from './ResolveCaseAccess';
import type { CaseActor } from './ResolveCaseAccess';
import { attachTeamMemberDisplay } from './AttachTeamMemberDisplay';
import type { PerformanceCaseDisplayDTO } from '@shared/dto';

export async function getAllCases(actor: CaseActor): Promise<PerformanceCaseDisplayDTO[]> {
  const where = await resolveCaseScopeWhere(actor);
  const cases = await prisma.performanceCase.findMany({ where, orderBy: { createdDate: 'desc' } });
  return attachTeamMemberDisplay(cases.map(toPerformanceCaseDTO));
}

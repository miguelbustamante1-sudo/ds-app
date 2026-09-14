import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { toPerformanceCaseDTO } from '../mappers';
import { canAccessCase } from './ResolveCaseAccess';
import type { CaseActor } from './ResolveCaseAccess';
import { attachTeamMemberDisplay } from './AttachTeamMemberDisplay';
import type { PerformanceCaseDisplayDTO } from '@shared/dto';

export async function getCase(caseId: number, actor: CaseActor): Promise<PerformanceCaseDisplayDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);
  if (!(await canAccessCase(perfCase, actor))) throw new AppError('Access denied', 403);
  const [withDisplay] = await attachTeamMemberDisplay([toPerformanceCaseDTO(perfCase)]);
  if (!withDisplay) throw new AppError('Case not found', 404);
  return withDisplay;
}

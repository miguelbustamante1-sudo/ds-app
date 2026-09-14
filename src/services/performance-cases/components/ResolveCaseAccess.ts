import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { getReportsForPerformanceReview } from '../../teamMember/queries/getReportsForPerformanceReview';

export interface CaseActor {
  teamMemberId: number;
  isAdmin: boolean;
}

interface CaseScopeFields {
  teamLeaderId: number;
  omId: number | null;
  agmId: number | null;
  directorId: number | null;
  hrPartnerId: number | null;
}

export async function resolveCaseScopeWhere(actor: CaseActor): Promise<Prisma.PerformanceCaseWhereInput> {
  if (actor.isAdmin) return {};
  const self = actor.teamMemberId;
  const reportIds = await getReportsForPerformanceReview(self);
  return {
    OR: [
      { teamLeaderId: { in: [self, ...reportIds] } },
      { omId: self },
      { agmId: self },
      { directorId: self },
      { hrPartnerId: self },
    ],
  };
}

export async function canAccessCase(perfCase: CaseScopeFields, actor: CaseActor): Promise<boolean> {
  if (actor.isAdmin) return true;
  const self = actor.teamMemberId;
  const directStakeholders = [
    perfCase.teamLeaderId,
    perfCase.omId,
    perfCase.agmId,
    perfCase.directorId,
    perfCase.hrPartnerId,
  ];
  if (directStakeholders.includes(self)) return true;
  const reportIds = await getReportsForPerformanceReview(self);
  return reportIds.includes(perfCase.teamLeaderId);
}

export async function assertCaseAccess(caseId: number, actor: CaseActor): Promise<void> {
  const perfCase = await prisma.performanceCase.findUnique({
    where: { caseId },
    select: { teamLeaderId: true, omId: true, agmId: true, directorId: true, hrPartnerId: true },
  });
  if (!perfCase) throw new AppError('Case not found', 404);
  if (!(await canAccessCase(perfCase, actor))) throw new AppError('Access denied', 403);
}

import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';

export interface CaseStakeholders {
  teamLeaderId: number;
  omId: number | null;
  agmId: number | null;
  directorId: number | null;
  hrPartnerId: number | null;
  managerEmail: string | null;
}

export async function resolveCaseStakeholders(caseId: number): Promise<CaseStakeholders> {
  const perfCase = await prisma.performanceCase.findUnique({
    where: { caseId },
    select: { teamLeaderId: true, omId: true, agmId: true, directorId: true, hrPartnerId: true, managerEmail: true },
  });
  if (!perfCase) throw new AppError('Case not found', 404);
  return perfCase;
}

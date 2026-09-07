import { prisma } from '../../../db/prisma';
import { toPerformanceCaseDTO } from '../mappers';
import type { PerformanceCaseDTO } from '@shared/dto';

export async function getCasesForHrPartner(hrPartnerTeamMemberId: number): Promise<PerformanceCaseDTO[]> {
  const cases = await prisma.performanceCase.findMany({
    where: {
      OR: [
        { hrPartnerId: hrPartnerTeamMemberId },
        { caseStatus: 'CLOSED_ESCALATED', hrPartnerId: null },
      ],
    },
    orderBy: { createdDate: 'desc' },
  });
  return cases.map(toPerformanceCaseDTO);
}

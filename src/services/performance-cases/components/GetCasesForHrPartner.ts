import { prisma } from '../../../db/prisma';
import { toPerformanceCaseDTO } from '../mappers';
import { attachTeamMemberDisplay } from './AttachTeamMemberDisplay';
import type { PerformanceCaseDisplayDTO } from '@shared/dto';

export async function getCasesForHrPartner(hrPartnerTeamMemberId: number): Promise<PerformanceCaseDisplayDTO[]> {
  const cases = await prisma.performanceCase.findMany({
    where: {
      OR: [
        { hrPartnerId: hrPartnerTeamMemberId },
        { caseStatus: 'CLOSED_ESCALATED', hrPartnerId: null },
      ],
    },
    orderBy: { createdDate: 'desc' },
  });
  return attachTeamMemberDisplay(cases.map(toPerformanceCaseDTO));
}

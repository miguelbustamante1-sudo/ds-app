import { prisma } from '../../../db/prisma';
import type { TpAnonymizationReviewDTO } from '@shared/dto/TpAnonymization';

export async function getNominationsForReview(cycId: number): Promise<TpAnonymizationReviewDTO[]> {
  const rows = await prisma.tpNomination.findMany({
    where: { cycId, nomStatus: 'SUBMITTED' },
    select: {
      nomId: true,
      nomType: true,
      nomAchievementText: true,
      nomAnonymizedText: true,
      nomAnonymizationStatus: true,
      nomAdminExceedsRole: true,
      nomAdminClientImpact: true,
      metrics: {
        select: { nmeMetricName: true, nmeMetricValue: true, nmeMetricBenchmark: true },
        orderBy: { nmeSortOrder: 'asc' },
      },
    },
    orderBy: { nomAnonymizationStatus: 'asc' },
  });
  return rows;
}

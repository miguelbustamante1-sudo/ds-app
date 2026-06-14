import { prisma } from '../../../db/prisma';
import { anonymizeNomination } from './anonymizationService';
import type { BatchAnonymizationResult } from '@shared/dto/TpAnonymization';

export async function anonymizeCycle(
  cycId: number,
  processedBy: number,
  userEmail: string
): Promise<BatchAnonymizationResult> {
  const nominations = await prisma.tpNomination.findMany({
    where: {
      cycId,
      nomStatus: 'SUBMITTED',
      nomAnonymizationStatus: 'PENDING',
    },
    select: { nomId: true },
  });

  const result: BatchAnonymizationResult = { processed: 0, failed: 0, needsReview: 0, errors: [] };

  for (const { nomId } of nominations) {
    try {
      const r = await anonymizeNomination(nomId, processedBy, userEmail);
      if (r.status === 'NEEDS_REVIEW') result.needsReview++;
      else result.processed++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        nomId,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return result;
}

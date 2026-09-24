import { prisma } from '../../../db/prisma';
import type { TriviaBatchStatusDTO, TriviaBatchStatus } from '@shared/dto';

export async function getLatestBatch(): Promise<TriviaBatchStatusDTO | null> {
  const batch = await prisma.triviaBatch.findFirst({ orderBy: { id: 'desc' } });
  if (!batch) return null;

  return {
    id: batch.id,
    status: batch.status as TriviaBatchStatus,
    requestedQuestionCount: batch.requestedQuestionCount,
    insertedQuestionCount: batch.insertedQuestionCount,
    errorMessage: batch.errorMessage,
    startedAt: batch.startedAt.toISOString(),
    completedAt: batch.completedAt ? batch.completedAt.toISOString() : null,
  };
}

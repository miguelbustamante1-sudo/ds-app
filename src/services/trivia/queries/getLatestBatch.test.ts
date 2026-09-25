import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLatestBatch } from './getLatestBatch';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: { triviaBatch: { findFirst: vi.fn() } },
}));

describe('getLatestBatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no batch has ever been pulled', async () => {
    (prisma.triviaBatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getLatestBatch();

    expect(result).toBeNull();
  });

  it('maps the most recent batch (by id desc) to TriviaBatchStatusDTO', async () => {
    (prisma.triviaBatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42,
      status: 'completed',
      requestedQuestionCount: 30,
      insertedQuestionCount: 27,
      errorMessage: null,
      startedAt: new Date('2026-09-24T08:00:00Z'),
      completedAt: new Date('2026-09-24T08:02:00Z'),
    });

    const result = await getLatestBatch();

    expect(prisma.triviaBatch.findFirst).toHaveBeenCalledWith({ orderBy: { id: 'desc' } });
    expect(result).toEqual({
      id: 42,
      status: 'completed',
      requestedQuestionCount: 30,
      insertedQuestionCount: 27,
      errorMessage: null,
      startedAt: '2026-09-24T08:00:00.000Z',
      completedAt: '2026-09-24T08:02:00.000Z',
    });
  });
});

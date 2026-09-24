import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listQuestionsForAdmin } from './listQuestionsForAdmin';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: { triviaQuestion: { findMany: vi.fn() } },
}));

describe('listQuestionsForAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps questions newest-first into AdminTriviaQuestionDTO shape', async () => {
    (prisma.triviaQuestion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        batchId: 5,
        questionText: 'Q1',
        option1: 'A',
        option2: 'B',
        option3: 'C',
        option4: 'D',
        correctOptionIndex: 1,
        isActive: true,
        createdAt: new Date('2026-09-24T08:00:00Z'),
      },
    ]);

    const result = await listQuestionsForAdmin();

    expect(prisma.triviaQuestion.findMany).toHaveBeenCalledWith({ orderBy: { id: 'desc' } });
    expect(result).toEqual([
      {
        id: 1,
        batchId: 5,
        questionText: 'Q1',
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndex: 1,
        isActive: true,
        createdAt: '2026-09-24T08:00:00.000Z',
      },
    ]);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordAnswer } from './RecordAnswer';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    triviaQuestion: { findUnique: vi.fn() },
    triviaAnswer: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../../audit/AuditOrchestrator', () => ({
  auditOrchestrator: { log: vi.fn() },
}));

describe('recordAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws AppError(404) when the question does not exist', async () => {
    (prisma.triviaQuestion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(recordAnswer(1, 99, 0, 'user@example.com')).rejects.toThrow('Trivia question not found');
  });

  it('throws AppError(400) when selectedOptionIndex is out of range', async () => {
    (prisma.triviaQuestion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, correctOptionIndex: 0 });

    await expect(recordAnswer(1, 99, 4, 'user@example.com')).rejects.toThrow('selectedOptionIndex must be between 0 and 3');
  });

  it('creates a new answer row and returns correctness when none exists', async () => {
    (prisma.triviaQuestion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, correctOptionIndex: 2 });
    (prisma.triviaAnswer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.triviaAnswer.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, questionId: 1, teamMemberId: 99 });

    const result = await recordAnswer(1, 99, 2, 'user@example.com');

    expect(result).toEqual({ isCorrect: true, correctOptionIndex: 2 });
    expect(prisma.triviaAnswer.create).toHaveBeenCalledWith({
      data: { questionId: 1, teamMemberId: 99, selectedOptionIndex: 2, isCorrect: true },
    });
    expect(auditOrchestrator.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityName: 'tra_trivia_answers', createdBy: 'user@example.com', oldValues: null }),
    );
  });

  it('updates and increments answerCount when an answer already exists', async () => {
    (prisma.triviaQuestion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, correctOptionIndex: 2 });
    const existing = { id: 5, questionId: 1, teamMemberId: 99, answerCount: 1 };
    (prisma.triviaAnswer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (prisma.triviaAnswer.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...existing, answerCount: 2 });

    const result = await recordAnswer(1, 99, 0, 'user@example.com');

    expect(result).toEqual({ isCorrect: false, correctOptionIndex: 2 });
    expect(prisma.triviaAnswer.update).toHaveBeenCalledWith({
      where: { questionId_teamMemberId: { questionId: 1, teamMemberId: 99 } },
      data: expect.objectContaining({ selectedOptionIndex: 0, isCorrect: false, answerCount: 2 }),
    });
  });
});

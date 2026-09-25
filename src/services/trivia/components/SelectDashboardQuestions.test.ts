import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectDashboardQuestions } from './SelectDashboardQuestions';
import { prisma } from '../../../db/prisma';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    triviaAnswer: { findMany: vi.fn() },
    triviaQuestion: { findMany: vi.fn() },
  },
}));

function makeQuestion(id: number) {
  return { id, questionText: `Q${id}`, option1: 'A', option2: 'B', option3: 'C', option4: 'D', correctOptionIndex: 0 };
}

describe('selectDashboardQuestions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns up to 5 eligible questions when the pool is large enough', async () => {
    (prisma.triviaAnswer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.triviaQuestion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => makeQuestion(i + 1)),
    );

    const result = await selectDashboardQuestions(99);

    expect(result).toHaveLength(5);
  });

  it('excludes questions answered by this user within the last 7 days', async () => {
    (prisma.triviaAnswer.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ questionId: 1 }, { questionId: 2 }]);
    (prisma.triviaQuestion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => makeQuestion(i + 1)),
    );

    await selectDashboardQuestions(99);

    expect(prisma.triviaQuestion.findMany).toHaveBeenCalledWith({
      where: { isActive: true, id: { notIn: [1, 2] } },
    });
  });

  it('backfills with least-recently-answered questions when the cooldown-eligible pool is under 5', async () => {
    (prisma.triviaAnswer.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ questionId: 1 }, { questionId: 2 }, { questionId: 3 }]) // recently answered
      .mockResolvedValueOnce([
        { questionId: 1, lastAnsweredAt: new Date('2026-09-20') },
        { questionId: 2, lastAnsweredAt: new Date('2026-09-22') },
        { questionId: 3, lastAnsweredAt: new Date('2026-09-24') },
      ]); // all answers by this user, for ranking
    (prisma.triviaQuestion.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeQuestion(4), makeQuestion(5)]) // eligible under cooldown (only 2, < 5)
      .mockResolvedValueOnce([makeQuestion(1), makeQuestion(2), makeQuestion(3), makeQuestion(4), makeQuestion(5), makeQuestion(6)]); // all active

    const result = await selectDashboardQuestions(99);

    expect(result).toHaveLength(5);
    // Question 1 was answered longest ago among the recently-answered ones, so it backfills first.
    expect(result.map((q) => q.id)).toContain(1);
  });

  it('returns whatever is available when the total active pool has fewer than 5 questions', async () => {
    (prisma.triviaAnswer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.triviaQuestion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([makeQuestion(1), makeQuestion(2)]);

    const result = await selectDashboardQuestions(99);

    expect(result).toHaveLength(2);
  });
});

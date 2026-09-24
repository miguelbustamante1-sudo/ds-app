import { prisma } from '../../../db/prisma';
import type { AdminTriviaQuestionDTO } from '@shared/dto';

export async function listQuestionsForAdmin(): Promise<AdminTriviaQuestionDTO[]> {
  const questions = await prisma.triviaQuestion.findMany({ orderBy: { id: 'desc' } });

  return questions.map((q) => ({
    id: q.id,
    batchId: q.batchId,
    questionText: q.questionText,
    options: [q.option1, q.option2, q.option3, q.option4],
    correctOptionIndex: q.correctOptionIndex,
    isActive: q.isActive,
    createdAt: q.createdAt.toISOString(),
  }));
}

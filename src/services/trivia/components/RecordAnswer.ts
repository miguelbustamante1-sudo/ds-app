import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';

export interface RecordAnswerResult {
  isCorrect: boolean;
  correctOptionIndex: number;
}

export async function recordAnswer(
  questionId: number,
  teamMemberId: number,
  selectedOptionIndex: number,
  createdByEmail: string,
): Promise<RecordAnswerResult> {
  const question = await prisma.triviaQuestion.findUnique({ where: { id: questionId } });
  if (!question) {
    throw new AppError('Trivia question not found', 404);
  }
  if (selectedOptionIndex < 0 || selectedOptionIndex > 3) {
    throw new AppError('selectedOptionIndex must be between 0 and 3', 400);
  }

  const isCorrect = selectedOptionIndex === question.correctOptionIndex;

  const existing = await prisma.triviaAnswer.findUnique({
    where: { questionId_teamMemberId: { questionId, teamMemberId } },
  });

  const saved = existing
    ? await prisma.triviaAnswer.update({
        where: { questionId_teamMemberId: { questionId, teamMemberId } },
        data: {
          selectedOptionIndex,
          isCorrect,
          answerCount: existing.answerCount + 1,
          lastAnsweredAt: new Date(),
        },
      })
    : await prisma.triviaAnswer.create({
        data: { questionId, teamMemberId, selectedOptionIndex, isCorrect },
      });

  await auditOrchestrator.log({
    entityName: 'tra_trivia_answers',
    entityId: String(saved.id),
    createdBy: createdByEmail,
    oldValues: existing ? (existing as unknown as Record<string, unknown>) : null,
    newValues: saved as unknown as Record<string, unknown>,
    comment: existing
      ? `Trivia answer updated for question ${questionId}`
      : `Trivia answer submitted for question ${questionId}`,
  });

  return { isCorrect, correctOptionIndex: question.correctOptionIndex };
}

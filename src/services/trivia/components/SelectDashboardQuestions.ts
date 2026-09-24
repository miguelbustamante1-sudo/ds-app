import { prisma } from '../../../db/prisma';

const QUESTIONS_PER_VISIT = 5;
const ANSWER_COOLDOWN_DAYS = 7;

export interface DashboardTriviaQuestion {
  id: number;
  questionText: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctOptionIndex: number;
}

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function selectDashboardQuestions(teamMemberId: number): Promise<DashboardTriviaQuestion[]> {
  const cooldownCutoff = new Date(Date.now() - ANSWER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const recentlyAnswered = await prisma.triviaAnswer.findMany({
    where: { teamMemberId, lastAnsweredAt: { gte: cooldownCutoff } },
    select: { questionId: true },
  });
  const recentlyAnsweredIds = recentlyAnswered.map((a) => a.questionId);

  const eligible = await prisma.triviaQuestion.findMany({
    where: { isActive: true, id: { notIn: recentlyAnsweredIds } },
  });

  if (eligible.length >= QUESTIONS_PER_VISIT) {
    return pickRandom(eligible, QUESTIONS_PER_VISIT);
  }

  const allActive = await prisma.triviaQuestion.findMany({ where: { isActive: true } });

  if (allActive.length <= QUESTIONS_PER_VISIT) {
    return allActive;
  }

  const allAnswersByThisUser = await prisma.triviaAnswer.findMany({ where: { teamMemberId } });
  const lastAnsweredByQuestionId = new Map(allAnswersByThisUser.map((a) => [a.questionId, a.lastAnsweredAt]));

  const rankedOldestFirst = [...allActive].sort((a, b) => {
    const aTime = lastAnsweredByQuestionId.get(a.id)?.getTime() ?? 0;
    const bTime = lastAnsweredByQuestionId.get(b.id)?.getTime() ?? 0;
    return aTime - bTime;
  });

  return rankedOldestFirst.slice(0, QUESTIONS_PER_VISIT);
}

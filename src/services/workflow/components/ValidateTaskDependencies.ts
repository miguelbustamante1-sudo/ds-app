import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';

/**
 * Ensures both predecessor and successor belong to the same template,
 * and that they are not the same task.
 */
export async function validateTaskDependencies(
  wflId: string,
  wtkPredecessorId: string,
  wtkSuccessorId: string,
): Promise<void> {
  if (wtkPredecessorId === wtkSuccessorId) {
    throw new AppError('Predecessor and successor must be different tasks', 400);
  }

  const [predecessor, successor] = await Promise.all([
    prisma.wtkWorkflowTemplateTask.findFirst({
      where: { wtkId: wtkPredecessorId, wflId },
      select: { wtkId: true },
    }),
    prisma.wtkWorkflowTemplateTask.findFirst({
      where: { wtkId: wtkSuccessorId, wflId },
      select: { wtkId: true },
    }),
  ]);

  if (predecessor === null) {
    throw new AppError('Predecessor task does not belong to this template', 400);
  }
  if (successor === null) {
    throw new AppError('Successor task does not belong to this template', 400);
  }
}

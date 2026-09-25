import { Prisma, WitWorkflowInstanceTask } from '@prisma/client';
import { AppError } from '../../../errors/AppError';
import { TaskNotFailedError } from '../errors';
import { calculateDueDate } from './CalculateDueDate';

export async function retryTask(
  tx: Prisma.TransactionClient,
  witId: string,
  retriedBy: string,
  retriedByUserId: string,
): Promise<WitWorkflowInstanceTask> {
  const task = await tx.witWorkflowInstanceTask.findUnique({
    where: { witId },
    include: {
      templateTask: {
        select: { template: { select: { shift: { include: { details: true } } } } },
      },
    },
  });

  if (!task || task.state !== 'FAILED') {
    throw new TaskNotFailedError();
  }

  if (task.retryCount >= task.maxRetryCount) {
    throw new AppError('No retries remaining for this task', 400);
  }

  const now = new Date();
  const dueAt = calculateDueDate(now, task.slaDurationHours ?? null, task.templateTask?.template.shift ?? null);

  const updated = await tx.witWorkflowInstanceTask.update({
    where: { witId },
    data: {
      state: 'ACTIVE',
      retryCount: task.retryCount + 1,
      completedAt: null,
      completedBy: null,
      outcomeCode: null,
      dueAt,
      updatedBy: retriedByUserId,
      updatedAt: now,
    },
  });

  await tx.walWorkflowAuditLog.create({
    data: {
      winId: task.winId,
      witId,
      eventType: 'TASK_RETRIED',
      oldState: 'FAILED',
      newState: 'ACTIVE',
      performedBy: retriedBy,
    },
  });

  return updated;
}

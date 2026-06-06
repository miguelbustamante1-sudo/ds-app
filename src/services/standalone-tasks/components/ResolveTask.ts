import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { ResolveStandaloneTaskDTO, StandaloneTaskDTO } from '@shared/dto';
import { TASK_INCLUDE, toTaskDTO } from '../mappers';

export async function resolveTask(
  taskId: number,
  input: ResolveStandaloneTaskDTO,
  resolvedBy: number,
): Promise<{ before: StandaloneTaskDTO; after: StandaloneTaskDTO }> {
  if (input.status !== 'APPROVED' && input.status !== 'REJECTED') {
    throw new AppError('Status must be APPROVED or REJECTED', 400);
  }
  if (input.status === 'REJECTED' && !input.comment?.trim()) {
    throw new AppError('A comment is required when rejecting a task', 400);
  }

  const existing = await prisma.standaloneTask.findUnique({
    where: { taskId },
    include: TASK_INCLUDE,
  });
  if (!existing) throw new AppError('Task not found', 404);
  if (existing.taskStatus !== 'PENDING') {
    throw new AppError('Only PENDING tasks can be resolved', 400);
  }

  const now = new Date();
  const updated = await prisma.standaloneTask.update({
    where: { taskId },
    data: {
      taskStatus: input.status,
      resolutionComment: input.comment?.trim() ?? null,
      resolvedBy,
      resolvedDate: now,
      updatedBy: resolvedBy,
      updatedDate: now,
    },
    include: TASK_INCLUDE,
  });

  return { before: toTaskDTO(existing), after: toTaskDTO(updated) };
}

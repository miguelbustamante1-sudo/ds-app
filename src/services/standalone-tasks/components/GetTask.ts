import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { StandaloneTaskDTO } from '@shared/dto';
import { TASK_INCLUDE, toTaskDTO } from '../mappers';

export async function getTaskById(taskId: number): Promise<StandaloneTaskDTO> {
  const task = await prisma.standaloneTask.findUnique({
    where: { taskId },
    include: TASK_INCLUDE,
  });
  if (!task) throw new AppError('Task not found', 404);
  return toTaskDTO(task);
}

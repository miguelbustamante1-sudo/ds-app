import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { CreateStandaloneTaskDTO, StandaloneTaskDTO } from '@shared/dto';
import { TASK_INCLUDE, toTaskDTO } from '../mappers';

export async function createTask(
  input: CreateStandaloneTaskDTO,
  createdBy: number,
): Promise<StandaloneTaskDTO> {
  if (!input.taskTitle?.trim()) throw new AppError('Task title is required', 400);
  if (!input.teamMemberId) throw new AppError('Assignee is required', 400);

  const member = await prisma.teamMember.findUnique({
    where: { teamMemberId: input.teamMemberId },
    select: { teamMemberId: true },
  });
  if (!member) throw new AppError('Assignee not found', 404);

  const task = await prisma.standaloneTask.create({
    data: {
      taskTitle: input.taskTitle.trim(),
      taskDescription: input.taskDescription?.trim() ?? null,
      taskPriority: input.taskPriority ?? 'MEDIUM',
      taskDueDate: input.taskDueDate ? new Date(input.taskDueDate) : null,
      teamMemberId: input.teamMemberId,
      taskReferenceType: input.taskReferenceType ?? null,
      taskReferenceId: input.taskReferenceId ?? null,
      taskSource: 'INTERNAL',
      createdBy,
    },
    include: TASK_INCLUDE,
  });

  return toTaskDTO(task);
}

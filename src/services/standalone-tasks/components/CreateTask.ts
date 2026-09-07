import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { Prisma } from '@prisma/client';
import type { CreateStandaloneTaskDTO, StandaloneTaskDTO } from '@shared/dto';
import { TASK_INCLUDE, toTaskDTO } from '../mappers';
import { FLAG_TASK_REFERENCE_TYPE_KEYWORD } from '../../flag-intake/components/BuildFlagReferenceKey';
import { resolveFlagDetail } from '../../flag-intake/components/ResolveFlagDetail';

interface CreateTaskOptions {
  taskSource?: string;
  apiKeyId?: number;
}

export async function createTask(
  input: CreateStandaloneTaskDTO,
  createdBy: number,
  options: CreateTaskOptions = {},
): Promise<StandaloneTaskDTO> {
  if (!input.taskTitle?.trim()) throw new AppError('Task title is required', 400);
  if (!input.teamMemberId) throw new AppError('Assignee is required', 400);

  const member = await prisma.teamMember.findUnique({
    where: { teamMemberId: input.teamMemberId },
    select: { teamMemberId: true },
  });
  if (!member) throw new AppError('Assignee not found', 404);

  if (input.hierarchyContextId != null) {
    const contextMember = await prisma.teamMember.findUnique({
      where: { teamMemberId: input.hierarchyContextId },
      select: { teamMemberId: true },
    });
    if (!contextMember) throw new AppError('Hierarchy context team member not found', 404);
  }

  const parsedDetail = input.taskReferenceType?.includes(FLAG_TASK_REFERENCE_TYPE_KEYWORD)
    ? await resolveFlagDetail(input.taskTitle.trim(), input.taskDescription?.trim() ?? null)
    : null;

  const taskStatus = input.taskStatus ?? 'PENDING';

  const task = await prisma.standaloneTask.create({
    data: {
      taskTitle: input.taskTitle.trim(),
      taskDescription: input.taskDescription?.trim() ?? null,
      taskPriority: input.taskPriority ?? 'MEDIUM',
      taskDueDate: input.taskDueDate ? new Date(input.taskDueDate) : null,
      teamMemberId: input.teamMemberId,
      taskReferenceType: input.taskReferenceType ?? null,
      taskReferenceId: input.taskReferenceId ?? null,
      hierarchyContextId: input.hierarchyContextId ?? null,
      taskSource: options.taskSource ?? 'INTERNAL',
      apiKeyId: options.apiKeyId ?? null,
      ...(parsedDetail ? { parsedDetail: parsedDetail as unknown as Prisma.InputJsonValue } : {}),
      createdBy,
      taskStatus,
      // A task created already resolved (e.g. pulled from Monday with a "Completed"-style
      // status) must carry the same resolution fields a normal manual resolution would set,
      // so it's indistinguishable in the data from one resolved through the UI.
      ...(taskStatus !== 'PENDING' && {
        resolvedBy: createdBy,
        resolvedDate: new Date(),
        resolutionComment: input.resolutionComment ?? null,
      }),
    },
    include: TASK_INCLUDE,
  });

  return toTaskDTO(task);
}

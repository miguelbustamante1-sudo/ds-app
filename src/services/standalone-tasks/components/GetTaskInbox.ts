import { prisma } from '../../../db/prisma';
import type { StandaloneTaskDTO } from '@shared/dto';
import { TASK_INCLUDE, toTaskDTO } from '../mappers';

export async function getTaskInbox(teamMemberId: number): Promise<StandaloneTaskDTO[]> {
  const tasks = await prisma.standaloneTask.findMany({
    where: { teamMemberId, taskStatus: 'PENDING' },
    orderBy: [{ taskDueDate: 'asc' }, { createdDate: 'asc' }],
    include: TASK_INCLUDE,
  });
  return tasks.map(toTaskDTO);
}

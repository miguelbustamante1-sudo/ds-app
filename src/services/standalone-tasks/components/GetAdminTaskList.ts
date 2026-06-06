import { prisma } from '../../../db/prisma';
import type { StandaloneTaskDTO } from '@shared/dto';
import { TASK_INCLUDE, toTaskDTO } from '../mappers';

export interface AdminTaskListFilters {
  showResolved: boolean;
}

export async function getAdminTaskList(
  filters: AdminTaskListFilters,
): Promise<StandaloneTaskDTO[]> {
  const tasks = await prisma.standaloneTask.findMany({
    where: filters.showResolved ? {} : { taskStatus: 'PENDING' },
    orderBy: [{ taskDueDate: 'asc' }, { createdDate: 'desc' }],
    include: TASK_INCLUDE,
  });
  return tasks.map(toTaskDTO);
}

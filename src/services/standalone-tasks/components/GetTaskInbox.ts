import { prisma } from '../../../db/prisma';
import type { StandaloneTaskDTO } from '@shared/dto';
import { TASK_INCLUDE, toTaskDTO } from '../mappers';
import { FLAG_TASK_REFERENCE_TYPE_KEYWORD } from '../../flag-intake/components/BuildFlagReferenceKey';

export async function getTaskInbox(teamMemberId: number): Promise<StandaloneTaskDTO[]> {
  const tasks = await prisma.standaloneTask.findMany({
    where: {
      teamMemberId,
      taskStatus: 'PENDING',
      // Flag-sourced tasks (any taskReferenceType containing 'FLAG' — CSV
      // intake's 'FLAG_INTAKE', the manual dialog's plain 'FLAG', etc.)
      // surface in the dashboard's Weekly Flags panel instead of the
      // personal to-do inbox — exclude them here. Most regular tasks have a
      // null taskReferenceType, and SQL's `NULL LIKE '%FLAG%'` evaluates to
      // NULL rather than false, so `NOT: { contains: ... }` alone would
      // silently drop every null-reference-type row too — the explicit
      // `taskReferenceType: null` branch keeps them.
      OR: [
        { taskReferenceType: null },
        { NOT: { taskReferenceType: { contains: FLAG_TASK_REFERENCE_TYPE_KEYWORD } } },
      ],
    },
    orderBy: [{ taskDueDate: 'asc' }, { createdDate: 'asc' }],
    include: TASK_INCLUDE,
  });
  return tasks.map(toTaskDTO);
}

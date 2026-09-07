import { prisma } from '../../../db/prisma';
import { FLAG_TASK_REFERENCE_TYPE_KEYWORD } from '../../flag-intake/components/BuildFlagReferenceKey';

/**
 * Lean, purpose-built row for the Dashboard "Weekly Flags" panel — not the
 * general-purpose StandaloneTaskDTO, since this feature only needs a handful
 * of fields plus the flagged member's Workday ID (which TASK_INCLUDE/toTaskDTO
 * don't carry). Mapping this into SupervisorFlagDTO is the dashboard domain's
 * job (see src/services/dashboard/getSupervisorFlags.ts), not this domain's.
 */
export interface FlagTaskRow {
  taskId: number;
  taskTitle: string;
  taskDescription: string | null;
  createdDate: Date;
  hierarchyContextId: number | null;
  hierarchyContextNames: string | null;
  hierarchyContextSurnames: string | null;
  hierarchyContextWorkdayId: string | null;
  parsedDetail: unknown;
}

/**
 * PENDING flag-intake tasks about any of the given team members (the
 * `hierarchyContextId` — the flagged member, not the assignee).
 */
export async function getFlagsForReports(reportIds: number[]): Promise<FlagTaskRow[]> {
  if (reportIds.length === 0) return [];

  const tasks = await prisma.standaloneTask.findMany({
    where: {
      taskReferenceType: { contains: FLAG_TASK_REFERENCE_TYPE_KEYWORD },
      taskStatus: 'PENDING',
      hierarchyContextId: { in: reportIds },
    },
    orderBy: [{ createdDate: 'asc' }],
    include: {
      hierarchyContext: { select: { teamMemberNames: true, teamMemberSurnames: true, workdayId: true } },
    },
  });

  return tasks.map((task) => ({
    taskId: task.taskId,
    taskTitle: task.taskTitle,
    taskDescription: task.taskDescription,
    createdDate: task.createdDate,
    hierarchyContextId: task.hierarchyContextId,
    hierarchyContextNames: task.hierarchyContext?.teamMemberNames ?? null,
    hierarchyContextSurnames: task.hierarchyContext?.teamMemberSurnames ?? null,
    hierarchyContextWorkdayId: task.hierarchyContext?.workdayId ?? null,
    parsedDetail: task.parsedDetail,
  }));
}

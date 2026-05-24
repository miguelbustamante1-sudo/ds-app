import { prisma } from '../../../db/prisma';

export interface TaskInboxItem {
  witId: string;
  witName: string;
  winId: string;
  winName: string;
  priority: string;
  dueAt: Date | null;
  state: string;
  outcomeCode: string | null;
  isOverdue: boolean;
  isClaimed: boolean;
  isClaimedByMe: boolean;
  claimedByUserId: string | null;
}

interface GetTaskInboxParams {
  dsUserId: string;
  isAdmin: boolean;
}

export async function getTaskInbox(
  params: GetTaskInboxParams,
): Promise<TaskInboxItem[]> {
  const { dsUserId, isAdmin } = params;

  const tasks = await prisma.witWorkflowInstanceTask.findMany({
    where: isAdmin
      ? { state: { in: ['ACTIVE', 'PENDING'] } }
      : {
          state: { in: ['ACTIVE', 'PENDING'] },
          OR: [
            { resolvedUserId: dsUserId },
            {
              // TODO: role-based inbox filtering is not yet implemented.
              // Once a dtos_user_roles mapping table exists, filter wit_assigned_role_id
              // against the user's assigned DTOS roles here.
              // For now, role-based tasks (resolvedUserId IS NULL) are included for all non-admin users.
              resolvedUserId: null,
              assignedRoleId: { not: null },
            },
          ],
        },
    include: {
      instance: {
        select: { name: true },
      },
    },
  });

  const now = new Date();

  return tasks.map((task) => ({
    witId: task.witId,
    witName: task.name,
    winId: task.winId,
    winName: task.instance.name,
    priority: task.priority,
    dueAt: task.dueAt,
    state: task.state,
    outcomeCode: task.outcomeCode,
    isOverdue: task.dueAt !== null && task.dueAt < now,
    isClaimed: task.resolvedUserId !== null,
    isClaimedByMe: task.resolvedUserId === dsUserId,
    claimedByUserId: task.resolvedUserId,
  }));
}

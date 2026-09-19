import { prisma } from '../../../db/prisma';
import { getBusinessReferenceLinkResolver } from './BusinessReferenceLinkRegistry';

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
  // Claim/release only makes sense for ROLE-assigned tasks, which fan out to
  // multiple eligible users until one claims it. USER/DYNAMIC/
  // DYNAMIC_TD_HIERARCHY/CONTEXT tasks always have resolvedUserId set
  // directly — that's assignment, not a claim, so there's no "release" for
  // the frontend to offer even though resolvedUserId looks the same either way.
  assignmentType: string;
  isClaimed: boolean;
  isClaimedByMe: boolean;
  claimedByUserId: number | null;
  entityUrl: string | null;
  entitySummary: string | null;
}

interface GetTaskInboxParams {
  dsUserId: number;
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
              // ROLE tasks fan out to one assignee row per eligible member
              // (wta_workflow_task_assignees). A user sees the task only while their own row is
              // still PENDING — once any member completes it, every sibling row flips to
              // SUPERSEDED and the task drops out of the others' inboxes automatically.
              resolvedUserId: null,
              assignees: { some: { userId: dsUserId, state: 'PENDING' } },
            },
          ],
        },
    include: {
      instance: {
        select: { name: true, businessReferenceType: true, businessReferenceId: true },
      },
    },
  });

  const now = new Date();

  return Promise.all(
    tasks.map(async (task) => {
      let entityUrl: string | null = null;
      let entitySummary: string | null = null;

      if (task.instance.businessReferenceType && task.instance.businessReferenceId) {
        const resolver = getBusinessReferenceLinkResolver(task.instance.businessReferenceType);
        const link = resolver ? await resolver(task.instance.businessReferenceId) : null;
        if (link) {
          entityUrl = link.url;
          entitySummary = link.summary;
        }
      }

      return {
        witId: task.witId,
        witName: task.name,
        winId: task.winId,
        winName: task.instance.name,
        priority: task.priority,
        dueAt: task.dueAt,
        state: task.state,
        outcomeCode: task.outcomeCode,
        isOverdue: task.dueAt !== null && task.dueAt < now,
        assignmentType: task.assignmentType,
        isClaimed: task.resolvedUserId !== null,
        isClaimedByMe: task.resolvedUserId === dsUserId,
        claimedByUserId: task.resolvedUserId,
        entityUrl,
        entitySummary,
      };
    }),
  );
}

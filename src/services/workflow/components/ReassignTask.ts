import { WitWorkflowInstanceTask } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import {
  ReassignmentNotAllowedError,
  ReassignmentReasonRequiredError,
  TaskNotActiveForReassignError,
} from '../errors';
import { notifyWorkflowEvent } from './NotificationDispatcher';
import { getUsersByRoleName } from '../queries/getUsersByRoleName';

interface ReassignInput {
  witId: string;
  toUserId?: number;
  toRoleId?: string;
  reason: string;
  reassignedBy: string;       // req.user.email
  reassignedByUserId: string; // req.user.dsUserId.toString()
}

export async function reassignTask(input: ReassignInput): Promise<WitWorkflowInstanceTask> {
  const { witId, toUserId, toRoleId, reason, reassignedBy, reassignedByUserId } = input;

  let taskBefore: WitWorkflowInstanceTask | null = null;

  const updated = await prisma.$transaction(async (tx) => {
    const task = await tx.witWorkflowInstanceTask.findUnique({ where: { witId } });

    if (!task || task.state !== 'ACTIVE') {
      throw new TaskNotActiveForReassignError();
    }

    taskBefore = task;

    if (task.wtkId !== null) {
      const templateTask = await tx.wtkWorkflowTemplateTask.findUnique({
        where: { wtkId: task.wtkId },
      });

      if (templateTask !== null) {
        if (!templateTask.allowReassignment) {
          throw new ReassignmentNotAllowedError();
        }

        if (templateTask.requireCommentOnReassign && !reason?.trim()) {
          throw new ReassignmentReasonRequiredError();
        }
      }
    }

    await tx.wreWorkflowTaskReassignment.create({
      data: {
        witId,
        fromUserId: task.resolvedUserId ?? null,
        fromRoleId: task.assignedRoleId ?? null,
        toUserId: toUserId ?? null,
        toRoleId: toRoleId ?? null,
        reason,
        reassignedBy,
        createdBy: reassignedByUserId,
      },
    });

    const result = await tx.witWorkflowInstanceTask.update({
      where: { witId },
      data: {
        resolvedUserId: toUserId ?? null,
        assignedRoleId: toRoleId ?? task.assignedRoleId,
        updatedBy: reassignedByUserId,
        updatedAt: new Date(),
      },
    });

    const reassignedAt = new Date();

    // Reassignment replaces who is responsible, so any outstanding ROLE fan-out rows from the
    // previous assignment are stale — supersede them first. Otherwise members of the OLD role
    // would keep seeing the task in their inbox after it moved elsewhere.
    await tx.wtaWorkflowTaskAssignee.updateMany({
      where: { witId, state: 'PENDING' },
      data: { state: 'SUPERSEDED', updatedBy: reassignedByUserId, updatedAt: reassignedAt },
    });

    // Reassigning to a role has to fan out again to the new role's members. Without this the
    // task would end up with resolvedUserId = null and no assignee rows at all, which
    // GetTaskInbox treats as "nobody's task" — it would vanish from every inbox.
    let recipientUserIds: string[] = [];

    if (toUserId !== undefined) {
      recipientUserIds = [toUserId.toString()];
    } else if (toRoleId) {
      const roleMemberIds = await getUsersByRoleName(toRoleId);

      for (const memberId of roleMemberIds) {
        // upsert, not create: this user may already hold a row for this task (just superseded
        // above, e.g. when reassigning back to a role they were previously part of), and
        // uq_wta_task_user would reject a duplicate insert.
        await tx.wtaWorkflowTaskAssignee.upsert({
          where: { witId_userId: { witId, userId: memberId } },
          create: {
            witId,
            userId: memberId,
            roleName: toRoleId,
            state: 'PENDING',
            createdBy: reassignedByUserId,
          },
          update: {
            roleName: toRoleId,
            state: 'PENDING',
            respondedAt: null,
            outcomeCode: null,
            updatedBy: reassignedByUserId,
            updatedAt: reassignedAt,
          },
        });
      }

      recipientUserIds = roleMemberIds.map((memberId) => memberId.toString());
    }

    await notifyWorkflowEvent({
      witId,
      eventType: 'ON_REASSIGNMENT',
      recipientUserIds,
    });

    await tx.walWorkflowAuditLog.create({
      data: {
        winId: task.winId,
        witId,
        eventType: 'TASK_REASSIGNED',
        performedBy: reassignedBy,
        oldState: task.state,
        newState: task.state,
        detailsJson: { fromUserId: task.resolvedUserId ?? null, toUserId: toUserId ?? null },
      },
    });

    return result;
  });

  await auditOrchestrator.log({
    entityName: 'wit_workflow_instance_tasks',
    entityId: witId,
    createdBy: reassignedBy,
    oldValues: { resolvedUserId: taskBefore !== null ? (taskBefore as WitWorkflowInstanceTask).resolvedUserId : null },
    newValues: { resolvedUserId: toUserId ?? null },
    comment: 'Task reassigned',
  });

  return updated;
}

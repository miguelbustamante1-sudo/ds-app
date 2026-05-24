import { WitWorkflowInstanceTask } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import {
  ReassignmentNotAllowedError,
  ReassignmentReasonRequiredError,
  TaskNotActiveForReassignError,
} from '../errors';
import { notifyWorkflowEvent } from './NotificationDispatcher';

interface ReassignInput {
  witId: string;
  toUserId?: string;
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

    await notifyWorkflowEvent({
      witId,
      eventType: 'ON_REASSIGNMENT',
      recipientUserIds: toUserId ? [toUserId] : [],
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

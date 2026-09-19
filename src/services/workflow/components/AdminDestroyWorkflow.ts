import { WinWorkflowInstance } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { WorkflowNotActiveError } from '../errors';
import { getDestroyHandler } from './WorkflowDestroyRegistry';

interface AdminDestroyInput {
  winId: string;
  reason: string;
  performedBy: string;
  performedByUserId: string;
}

export async function adminDestroyWorkflow(input: AdminDestroyInput): Promise<WinWorkflowInstance> {
  const { winId, reason, performedBy, performedByUserId } = input;

  const postCommit: { hook?: (() => Promise<void>) | undefined } = {};

  const updatedInstance = await prisma.$transaction(async (tx) => {
    // 1. Load instance and confirm it is ACTIVE
    const instance = await tx.winWorkflowInstance.findUnique({ where: { winId } });
    if (!instance || instance.status !== 'ACTIVE') {
      throw new WorkflowNotActiveError();
    }

    const now = new Date();

    // 2. Load all remaining active/pending tasks
    const remainingTasks = await tx.witWorkflowInstanceTask.findMany({
      where: { winId, state: { in: ['ACTIVE', 'PENDING'] } },
    });

    // 3. Void each remaining task
    for (const task of remainingTasks) {
      await tx.witWorkflowInstanceTask.update({
        where: { witId: task.witId },
        data: {
          state: 'VOIDED',
          voidedAt: now,
          voidedBy: performedBy,
          updatedBy: performedByUserId,
          updatedAt: now,
        },
      });

      await tx.walWorkflowAuditLog.create({
        data: {
          winId,
          witId: task.witId,
          eventType: 'TASK_VOIDED',
          performedBy,
          reason,
          oldState: task.state,
          newState: 'VOIDED',
        },
      });
    }

    // 4. Mark instance as DESTROYED
    const destroyed = await tx.winWorkflowInstance.update({
      where: { winId },
      data: {
        status: 'DESTROYED',
        destroyedAt: now,
        destroyedBy: performedByUserId,
        destructionReason: reason,
      },
    });

    // 5. Write WAL for instance destruction
    await tx.walWorkflowAuditLog.create({
      data: {
        winId,
        eventType: 'INSTANCE_DESTROYED',
        performedBy,
        reason,
      },
    });

    // 6. Let the linked business record react to the destruction (e.g. cancel
    // the time-off request an authorization workflow was backing), if a
    // handler is registered for its businessReferenceType.
    if (instance.businessReferenceType && instance.businessReferenceId) {
      const handler = getDestroyHandler(instance.businessReferenceType);
      if (handler) {
        postCommit.hook = await handler({
          tx,
          winId,
          businessReferenceId: instance.businessReferenceId,
          reason,
          performedBy,
          performedByUserId,
        });
      }
    }

    return destroyed;
  });

  if (postCommit.hook) {
    await postCommit.hook();
  }

  // App-level audit record (outside transaction)
  await auditOrchestrator.log({
    entityName: 'win_workflow_instances',
    entityId: winId,
    createdBy: performedBy,
    oldValues: { status: 'ACTIVE' },
    newValues: { status: 'DESTROYED', destructionReason: reason },
    comment: `Admin destroyed workflow instance ${winId}`,
  });

  return updatedInstance;
}

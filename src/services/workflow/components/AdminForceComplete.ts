import { WinWorkflowInstance } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { WorkflowNotActiveError } from '../errors';

interface AdminForceCompleteInput {
  winId: string;
  reason: string;
  performedBy: string;
  performedByUserId: string;
}

export async function adminForceComplete(input: AdminForceCompleteInput): Promise<WinWorkflowInstance> {
  const { winId, reason, performedBy, performedByUserId } = input;

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

    // 3. Override each remaining task
    for (const task of remainingTasks) {
      await tx.witWorkflowInstanceTask.update({
        where: { witId: task.witId },
        data: {
          state: 'OVERRIDDEN',
          overriddenAt: now,
          overriddenBy: performedBy,
          overrideReason: reason,
          updatedBy: performedByUserId,
          updatedAt: now,
        },
      });

      await tx.walWorkflowAuditLog.create({
        data: {
          winId,
          witId: task.witId,
          eventType: 'TASK_OVERRIDDEN',
          performedBy,
          reason,
          oldState: task.state,
          newState: 'OVERRIDDEN',
        },
      });
    }

    // 4. Mark instance as COMPLETED (forced)
    const completed = await tx.winWorkflowInstance.update({
      where: { winId },
      data: {
        status: 'COMPLETED',
        forcedCompletedAt: now,
        forcedCompletedBy: performedByUserId,
        forcedCompletionReason: reason,
      },
    });

    // 5. Write WAL for instance forced completion
    await tx.walWorkflowAuditLog.create({
      data: {
        winId,
        eventType: 'INSTANCE_FORCED_COMPLETED',
        performedBy,
        reason,
      },
    });

    return completed;
  });

  // App-level audit record (outside transaction)
  await auditOrchestrator.log({
    entityName: 'win_workflow_instances',
    entityId: winId,
    createdBy: performedBy,
    oldValues: { status: 'ACTIVE' },
    newValues: { status: 'COMPLETED', forcedCompletionReason: reason },
    comment: `Admin force-completed workflow instance ${winId}`,
  });

  return updatedInstance;
}

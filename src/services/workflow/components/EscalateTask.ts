import { Prisma } from '@prisma/client';
import { getReportsForWorkflowEscalation } from '../../teamMember/queries/getReportsForWorkflowEscalation';
import { notifyWorkflowEvent } from './NotificationDispatcher';

export async function escalateTask(tx: Prisma.TransactionClient, witId: string): Promise<void> {
  const task = await tx.witWorkflowInstanceTask.findUnique({ where: { witId } });

  // Task may have been deleted between the scanner query and this call — skip silently.
  if (!task) {
    return;
  }

  // Already escalated — idempotency guard for scanner restarts.
  if (task.escalatedAt !== null) {
    return;
  }

  const now = new Date();

  await tx.witWorkflowInstanceTask.update({
    where: { witId },
    data: { escalatedAt: now, updatedAt: now },
  });

  // Determine escalation recipients.
  let recipientIds: string[] = [];

  if (task.escalationUserId !== null) {
    recipientIds = [task.escalationUserId.toString()];
  } else if (task.escalationRoleId !== null) {
    recipientIds = [task.escalationRoleId];
  } else if (task.escalationDynamicType !== null) {
    const instance = await tx.winWorkflowInstance.findUnique({ where: { winId: task.winId } });
    const ownerUserId = instance?.ownerUserId ?? null;

    if (ownerUserId !== null) {
      const reportIds = await getReportsForWorkflowEscalation(ownerUserId);
      recipientIds = reportIds.map((id) => id.toString());
    }
  }

  await notifyWorkflowEvent({ witId, eventType: 'ON_ESCALATION', recipientUserIds: recipientIds });

  await tx.walWorkflowAuditLog.create({
    data: {
      winId: task.winId,
      witId,
      eventType: 'TASK_ESCALATED',
      performedBy: 'system',
    },
  });
}

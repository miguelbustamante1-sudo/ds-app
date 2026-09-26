import { Prisma } from '@prisma/client';
import { resolveFirstSupervisorUserId } from './ResolveFirstSupervisorUserId';
import { notifyWorkflowEvent } from './NotificationDispatcher';
import { getUsersByRoleName } from '../queries/getUsersByRoleName';

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
    // tbl_users has no boolean active/enabled column — "active" is whether
    // usr_enddat is null or in the future, same definition getUsersByRoleName
    // already uses. A departed employee must never receive a live escalation.
    const escalationUser = await tx.user.findFirst({
      where: {
        userId: task.escalationUserId,
        OR: [{ userEndDate: null }, { userEndDate: { gt: now } }],
      },
    });
    if (escalationUser) {
      recipientIds = [escalationUser.userId.toString()];
    }
  } else if (task.escalationRoleId !== null) {
    // escalationRoleId holds a role NAME after the retype. Resolve it to its members.
    // Previously this pushed the raw column value straight through; NotificationDispatcher
    // coerces recipients with Number(), turning it into NaN, and dropped it with a warning —
    // so role-based escalation notified nobody at all.
    const roleMemberIds = await getUsersByRoleName(task.escalationRoleId);
    recipientIds = roleMemberIds.map((memberId) => memberId.toString());
  } else if (task.escalationDynamicType !== null) {
    // Escalates to the supervisor of whoever the task is actually assigned to
    // (the person who didn't act in time) — not the workflow's ownerUserId,
    // which is whoever requested the instance and may be a different person.
    if (task.resolvedUserId !== null) {
      const supervisorUserId = await resolveFirstSupervisorUserId(tx, task.resolvedUserId);
      if (supervisorUserId !== null) {
        recipientIds = [supervisorUserId.toString()];
      }
    }
  }

  if (recipientIds.length === 0) {
    await tx.walWorkflowAuditLog.create({
      data: {
        winId: task.winId,
        witId,
        eventType: 'NO_RESPONSIBLE_FOUND',
        performedBy: 'system',
      },
    });
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

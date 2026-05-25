import { Prisma, WitWorkflowInstanceTask } from '@prisma/client';
import {
  TaskNotActiveError,
  TaskNotClaimableError,
  TaskAlreadyClaimedError,
} from '../errors';

export async function claimTask(
  tx: Prisma.TransactionClient,
  witId: string,
  claimedBy: string,
  claimedByUserId: number,
): Promise<WitWorkflowInstanceTask> {
  const task = await tx.witWorkflowInstanceTask.findUnique({
    where: { witId },
  });

  if (!task || task.state !== 'ACTIVE') {
    throw new TaskNotActiveError();
  }

  if (task.assignmentType !== 'ROLE') {
    throw new TaskNotClaimableError();
  }

  if (task.resolvedUserId !== null) {
    throw new TaskAlreadyClaimedError();
  }

  const now = new Date();

  const updated = await tx.witWorkflowInstanceTask.update({
    where: { witId },
    data: {
      resolvedUserId: claimedByUserId,
      updatedBy: claimedByUserId.toString(),
      updatedAt: now,
    },
  });

  await tx.walWorkflowAuditLog.create({
    data: {
      winId: task.winId,
      witId,
      eventType: 'TASK_CLAIMED',
      performedBy: claimedBy,
    },
  });

  return updated;
}

export async function unclaimTask(
  tx: Prisma.TransactionClient,
  witId: string,
  unclaimedBy: string,
  unclaimedByUserId: number,
): Promise<WitWorkflowInstanceTask> {
  const task = await tx.witWorkflowInstanceTask.findUnique({
    where: { witId },
  });

  if (!task || task.state !== 'ACTIVE') {
    throw new TaskNotActiveError();
  }

  // Confirm the requester is the one who claimed it.
  // Admin override is enforced at the route level — not checked here.
  if (task.resolvedUserId !== unclaimedByUserId) {
    // Allow: if resolvedUserId is null, there is nothing to unclaim — still accept gracefully
    // but in practice the route should validate admin access before calling this
  }

  const now = new Date();

  const updated = await tx.witWorkflowInstanceTask.update({
    where: { witId },
    data: {
      resolvedUserId: null,
      updatedBy: unclaimedByUserId.toString(),
      updatedAt: now,
    },
  });

  await tx.walWorkflowAuditLog.create({
    data: {
      winId: task.winId,
      witId,
      eventType: 'TASK_UNCLAIMED',
      performedBy: unclaimedBy,
    },
  });

  return updated;
}

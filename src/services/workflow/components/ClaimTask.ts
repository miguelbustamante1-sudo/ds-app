import { Prisma, WitWorkflowInstanceTask } from '@prisma/client';
import {
  TaskNotActiveError,
  TaskNotClaimableError,
  TaskAlreadyClaimedError,
  TaskExecutionForbiddenError,
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

  if (task.assignmentType !== 'ROLE') {
    throw new TaskNotClaimableError('Task is not role-assigned; releasing is not applicable');
  }

  // Confirm the requester is the one who claimed it — this used to be a
  // documented no-op, which meant any authenticated user with Workflow:create
  // could release a task claimed by someone else via a direct API call, even
  // though the frontend only ever shows Release to whoever claimed it.
  if (task.resolvedUserId !== unclaimedByUserId) {
    throw new TaskExecutionForbiddenError('Task was not claimed by this user');
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

import { Prisma } from '@prisma/client';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';

export interface ResolveTaskAsMissedResult {
  resolved: boolean;
}

/**
 * Atomic idempotency guard: flips an ACTIVE task to MISSED via a
 * state-guarded updateMany. If another scanner tick already won (count !==
 * 1), this is a no-op — duplicate deadline processing must never double-fire.
 */
export async function resolveTaskAsMissed(
  tx: Prisma.TransactionClient,
  witId: string,
): Promise<ResolveTaskAsMissedResult> {
  const existing = await tx.witWorkflowInstanceTask.findUnique({ where: { witId } });
  if (!existing) {
    return { resolved: false };
  }

  const now = new Date();
  const { count } = await tx.witWorkflowInstanceTask.updateMany({
    where: { witId, state: 'ACTIVE' },
    data: { state: 'MISSED', missedResolvedAt: now, updatedAt: now },
  });

  if (count !== 1) {
    return { resolved: false };
  }

  const updated = await tx.witWorkflowInstanceTask.findUniqueOrThrow({ where: { witId } });

  await tx.walWorkflowAuditLog.create({
    data: {
      winId: updated.winId,
      witId,
      eventType: 'TASK_MISSED',
      oldState: 'ACTIVE',
      newState: 'MISSED',
      performedBy: 'system',
      detailsJson: {
        deadline: updated.dueAt,
        resolvedAt: now.toISOString(),
        attemptNumber: updated.attemptNumber,
        remainingReplacements: updated.remainingReplacements,
      },
    },
  });

  await auditOrchestrator.log({
    entityName: 'wit_workflow_instance_tasks',
    entityId: witId,
    createdBy: 'system',
    oldValues: null,
    newValues: updated as unknown as Record<string, unknown>,
    comment: 'Task resolved as Missed',
  });

  return { resolved: true };
}

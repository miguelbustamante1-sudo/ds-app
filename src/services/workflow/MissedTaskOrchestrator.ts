import { prisma } from '../../db/prisma';
import { escalateTask } from './components/EscalateTask';
import { resolveTaskAsMissed } from './components/ResolveTaskAsMissed';
import { createReplacementTask, type MissedTaskSnapshot } from './components/CreateReplacementTask';
import { notifyWorkflowEvent } from './components/NotificationDispatcher';

/**
 * Entry point for a task whose deadlineAction is MISSED_AND_RECREATE, called
 * from SlaBreachScanner in place of escalateTask. Resolves the task as
 * Missed, then either creates a shorter-duration replacement (if
 * remainingReplacements > 0) or falls through to the existing final
 * escalation path (escalateTask, unchanged) when replacements are
 * exhausted.
 */
export async function processMissedTask(witId: string): Promise<void> {
  const assignment = await prisma.$transaction(async (tx) => {
    const resolution = await resolveTaskAsMissed(tx, witId);
    if (!resolution.resolved) return null;

    const missedTask = await tx.witWorkflowInstanceTask.findUniqueOrThrow({
      where: { witId },
      include: { instance: true },
    });

    if ((missedTask.remainingReplacements ?? 0) <= 0) {
      await escalateTask(tx, witId);
      return null;
    }

    if (!missedTask.wtkId) {
      // A task with no template-task link cannot have MISSED_AND_RECREATE
      // configured in the first place (deadlineAction lives on
      // WtkWorkflowTemplateTask), so this should be unreachable — escalate
      // defensively rather than silently drop the deadline.
      await escalateTask(tx, witId);
      return null;
    }

    const wtk = await tx.wtkWorkflowTemplateTask.findUniqueOrThrow({
      where: { wtkId: missedTask.wtkId },
      include: { template: { include: { shift: { include: { details: true } } } } },
    });

    const snapshot: MissedTaskSnapshot = {
      witId: missedTask.witId,
      winId: missedTask.winId,
      wtkId: missedTask.wtkId,
      code: missedTask.code,
      name: missedTask.name,
      description: missedTask.description,
      sequenceNo: missedTask.sequenceNo,
      taskType: missedTask.taskType,
      assignmentType: missedTask.assignmentType,
      assignedUserId: missedTask.assignedUserId,
      assignedRoleId: missedTask.assignedRoleId,
      dynamicAssignmentType: missedTask.dynamicAssignmentType,
      priority: missedTask.priority,
      slaDurationHours: missedTask.slaDurationHours,
      maxRetryCount: missedTask.maxRetryCount,
      escalationUserId: missedTask.escalationUserId,
      escalationRoleId: missedTask.escalationRoleId,
      escalationDynamicType: missedTask.escalationDynamicType,
      attemptNumber: missedTask.attemptNumber,
      remainingReplacements: missedTask.remainingReplacements,
      originalTaskId: missedTask.originalTaskId,
    };

    const result = await createReplacementTask(tx, {
      missedTask: snapshot,
      reductionPercentage: Number(wtk.reductionPercentage ?? 0),
      shift: wtk.template.shift,
      ownerUserId: missedTask.instance.ownerUserId,
      businessReferenceType: missedTask.instance.businessReferenceType,
      businessReferenceId: missedTask.instance.businessReferenceId,
    });

    return result;
  });

  // Post-commit, same reason as every other notify call in this domain: if
  // the transaction rolled back, the replacement was never really created.
  if (assignment?.assignedUserId) {
    await notifyWorkflowEvent({
      witId: assignment.witId,
      eventType: 'ON_ASSIGNMENT',
      recipientUserIds: [assignment.assignedUserId.toString()],
    });
  }
}

import { prisma } from '../../../db/prisma';
import {
  WorkflowDeadlineActionReductionPercentageError,
  WorkflowDeadlineActionReplacementLimitError,
  WorkflowDeadlineActionEscalationTargetError,
} from '../errors';

/**
 * Called at publish time, alongside validateExecutionType. Every active task
 * configured with deadlineAction MISSED_AND_RECREATE must have a valid
 * reductionPercentage, replacementLimit, and a final escalation target —
 * ESCALATE-mode tasks are untouched (this spec doesn't newly require an
 * escalation target on them, even though it's a pre-existing gap).
 */
export async function validateDeadlineAction(wflId: string): Promise<void> {
  const tasks = await prisma.wtkWorkflowTemplateTask.findMany({
    where: { wflId, isActive: true },
    select: {
      code: true,
      deadlineAction: true,
      reductionPercentage: true,
      replacementLimit: true,
      escalationUserId: true,
      escalationRoleId: true,
      escalationDynamicType: true,
    },
  });

  for (const task of tasks) {
    if (task.deadlineAction !== 'MISSED_AND_RECREATE') continue;

    const reduction = task.reductionPercentage === null ? null : Number(task.reductionPercentage);
    if (reduction === null || reduction <= 0 || reduction > 1) {
      throw new WorkflowDeadlineActionReductionPercentageError(
        `Task '${task.code}' has deadlineAction MISSED_AND_RECREATE but reductionPercentage is missing or out of range (0, 1]`,
      );
    }

    if (task.replacementLimit === null || !Number.isInteger(task.replacementLimit) || task.replacementLimit < 0) {
      throw new WorkflowDeadlineActionReplacementLimitError(
        `Task '${task.code}' has deadlineAction MISSED_AND_RECREATE but replacementLimit is missing or not a non-negative integer`,
      );
    }

    if (task.escalationUserId === null && task.escalationRoleId === null && task.escalationDynamicType === null) {
      throw new WorkflowDeadlineActionEscalationTargetError(
        `Task '${task.code}' has deadlineAction MISSED_AND_RECREATE but no final escalation target is configured`,
      );
    }
  }
}

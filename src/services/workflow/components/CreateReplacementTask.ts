import { Prisma } from '@prisma/client';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { calculateReplacementDuration } from './CalculateReplacementDuration';
import { calculateDueDate, type ShiftWithDetails } from './CalculateDueDate';
import { resolveTaskResponsible } from './ResolveTaskResponsible';

export interface MissedTaskSnapshot {
  witId: string;
  winId: string;
  wtkId: string | null;
  code: string;
  name: string;
  description: string | null;
  sequenceNo: number | null;
  taskType: string;
  assignmentType: string;
  assignedUserId: number | null;
  assignedRoleId: string | null;
  dynamicAssignmentType: string | null;
  priority: string;
  slaDurationHours: number | null;
  maxRetryCount: number;
  escalationUserId: number | null;
  escalationRoleId: string | null;
  escalationDynamicType: string | null;
  attemptNumber: number;
  remainingReplacements: number | null;
  originalTaskId: string | null;
}

export interface CreateReplacementTaskInput {
  missedTask: MissedTaskSnapshot;
  reductionPercentage: number;
  shift: ShiftWithDetails | null;
  ownerUserId: number | null;
  businessReferenceType: string | null;
  businessReferenceId: string | null;
}

export interface CreateReplacementTaskResult {
  witId: string;
  assignedUserId: number | null;
}

/**
 * Creates the next attempt after a task is resolved as Missed: a new sibling
 * WitWorkflowInstanceTask row for the same wtkId (never a routed "next"
 * task), with a shorter SLA duration and one fewer remainingReplacements.
 * Field list mirrors WorkflowInstantiationOrchestrator's template-task copy
 * block so a Node-created replacement is shape-identical to one the
 * DB-native sp_engine_insert_task procedure would create.
 */
export async function createReplacementTask(
  tx: Prisma.TransactionClient,
  input: CreateReplacementTaskInput,
): Promise<CreateReplacementTaskResult> {
  const { missedTask, reductionPercentage, shift, ownerUserId, businessReferenceType, businessReferenceId } = input;

  const previousDuration = missedTask.slaDurationHours ?? 1;
  const newDuration = calculateReplacementDuration(previousDuration, reductionPercentage);
  const now = new Date();
  const dueAt = calculateDueDate(now, newDuration, shift);
  const originalTaskId = missedTask.originalTaskId ?? missedTask.witId;

  const replacement = await tx.witWorkflowInstanceTask.create({
    data: {
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
      state: 'ACTIVE',
      activatedAt: now,
      dueAt,
      slaDurationHours: newDuration,
      maxRetryCount: missedTask.maxRetryCount,
      escalationUserId: missedTask.escalationUserId,
      escalationRoleId: missedTask.escalationRoleId,
      escalationDynamicType: missedTask.escalationDynamicType,
      originalTaskId,
      previousTaskId: missedTask.witId,
      attemptNumber: missedTask.attemptNumber + 1,
      remainingReplacements: (missedTask.remainingReplacements ?? 0) - 1,
      createdBy: 'system',
    },
  });

  // Snapshot the reduction that produced this replacement onto the missed
  // task it replaced — historical attempts must not change if the template
  // config changes later (design doc's "Template updated between attempts").
  await tx.witWorkflowInstanceTask.update({
    where: { witId: missedTask.witId },
    data: { reductionPercentageApplied: new Prisma.Decimal(reductionPercentage) },
  });

  const responsible = await resolveTaskResponsible(tx, {
    witId: replacement.witId,
    assignmentType: missedTask.assignmentType,
    assignedUserId: missedTask.assignedUserId,
    assignedRoleId: missedTask.assignedRoleId,
    dynamicAssignmentType: missedTask.dynamicAssignmentType,
    ownerUserId,
    businessReferenceType,
    businessReferenceId,
    performedBy: 'system',
  });

  if (responsible.resolvedUserId) {
    await tx.witWorkflowInstanceTask.update({
      where: { witId: replacement.witId },
      data: { resolvedUserId: responsible.resolvedUserId },
    });
  }

  if (responsible.roleName !== null) {
    for (const candidateUserId of responsible.roleCandidateUserIds) {
      const assignee = await tx.wtaWorkflowTaskAssignee.create({
        data: {
          witId: replacement.witId,
          userId: candidateUserId,
          roleName: responsible.roleName,
          state: 'PENDING',
          createdBy: 'system',
        },
      });
      await auditOrchestrator.log({
        entityName: 'wta_workflow_task_assignees',
        entityId: assignee.wtaId,
        createdBy: 'system',
        oldValues: null,
        newValues: assignee as unknown as Record<string, unknown>,
        comment: `Role '${responsible.roleName}' fan-out assignee created for replacement task`,
      });
    }
  }

  await tx.walWorkflowAuditLog.create({
    data: {
      winId: missedTask.winId,
      witId: replacement.witId,
      eventType: 'TASK_REPLACEMENT_CREATED',
      performedBy: 'system',
      detailsJson: {
        previousTaskId: missedTask.witId,
        originalTaskId,
        attemptNumber: missedTask.attemptNumber + 1,
        slaDurationHours: newDuration,
        dueAt,
      },
    },
  });

  await auditOrchestrator.log({
    entityName: 'wit_workflow_instance_tasks',
    entityId: replacement.witId,
    createdBy: 'system',
    oldValues: null,
    newValues: replacement as unknown as Record<string, unknown>,
    comment: 'Replacement task created',
  });

  return { witId: replacement.witId, assignedUserId: responsible.resolvedUserId };
}

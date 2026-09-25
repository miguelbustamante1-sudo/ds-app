import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { calculateDueDate } from './CalculateDueDate';
import { resolveTaskResponsible } from './ResolveTaskResponsible';
import { WorkflowNotActiveError, AdminJumpTargetError, AdminJumpAssigneeRequiredError } from '../errors';

interface AdminTaskJumpInput {
  winId: string;
  targetWitId: string;
  reason: string;
  inputs: Array<{ wiiId: string; value: unknown }> | undefined;
  /** Required when the target task's assignmentType is CONTEXT (spec §4.6) — CONTEXT
   * has no resolution algorithm, only a caller-supplied value. */
  assigneeUserId: number | undefined;
  performedBy: string;       // req.user.email
  performedByUserId: string; // req.user.dsUserId.toString()
}

interface AdminTaskJumpResult {
  overriddenCount: number;
  activatedWitId: string;
}

export async function adminTaskJump(input: AdminTaskJumpInput): Promise<AdminTaskJumpResult> {
  const { winId, targetWitId, reason, inputs, assigneeUserId, performedBy, performedByUserId } = input;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Load instance and confirm it is ACTIVE
    const instance = await tx.winWorkflowInstance.findUnique({ where: { winId } });
    if (!instance || instance.status !== 'ACTIVE') {
      throw new WorkflowNotActiveError();
    }

    // 2. Load target task and confirm it belongs to this instance and is PENDING
    const targetTask = await tx.witWorkflowInstanceTask.findUnique({
      where: { witId: targetWitId },
      include: {
        templateTask: {
          select: { template: { select: { shift: { include: { details: true } } } } },
        },
      },
    });
    if (!targetTask || targetTask.winId !== winId || targetTask.state !== 'PENDING') {
      throw new AdminJumpTargetError();
    }

    // 3. Find all non-terminal tasks excluding the target
    const tasksToOverride = await tx.witWorkflowInstanceTask.findMany({
      where: {
        winId,
        state: { notIn: ['SUCCESS', 'FAILED', 'OVERRIDDEN', 'VOIDED'] },
        witId: { not: targetWitId },
      },
    });

    const now = new Date();

    // 4. Override each non-terminal task
    for (const task of tasksToOverride) {
      // Insert input values if provided for this task's wiiId(s)
      if (inputs && inputs.length > 0) {
        const taskInputs = await tx.wiiWorkflowInstanceTaskInput.findMany({
          where: { witId: task.witId },
        });
        const taskInputIds = new Set(taskInputs.map((i) => i.wiiId));

        for (const inp of inputs) {
          if (!taskInputIds.has(inp.wiiId)) continue;
          const rawValue = inp.value;
          await tx.wivWorkflowInstanceTaskInputValue.create({
            data: {
              witId: task.witId,
              wiiId: inp.wiiId,
              attemptNo: task.retryCount + 1,
              valueText: typeof rawValue === 'string' ? rawValue : null,
              valueNumber: typeof rawValue === 'number' ? rawValue : null,
              valueBoolean: typeof rawValue === 'boolean' ? rawValue : null,
              valueDate: rawValue instanceof Date ? rawValue : null,
              valueDatetime: null,
              valueJson: rawValue !== null && typeof rawValue === 'object' && !(rawValue instanceof Date)
                ? (rawValue as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              enteredAt: now,
              enteredBy: performedByUserId,
            },
          });
        }
      }

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

    // 5. Activate target task
    const dueAt = calculateDueDate(now, targetTask.slaDurationHours ?? null, targetTask.templateTask?.template.shift ?? null);

    await tx.witWorkflowInstanceTask.update({
      where: { witId: targetWitId },
      data: {
        state: 'ACTIVE',
        activatedAt: now,
        dueAt,
        updatedBy: performedByUserId,
        updatedAt: now,
      },
    });

    // 6. Resolve responsible user for the target task. CONTEXT has no
    // resolution algorithm for resolveTaskResponsible to run (spec §2.4) — the
    // caller must supply the assignee directly. Without this, an unmodified
    // Jump lands with resolvedUserId = null and zero assignee rows, which the
    // real completion-authorization check (TaskCompletionOrchestrator.ts:110-126)
    // treats as completable by any authenticated user (spec §4.6).
    if (targetTask.assignmentType === 'CONTEXT') {
      if (!assigneeUserId) {
        throw new AdminJumpAssigneeRequiredError();
      }

      await tx.witWorkflowInstanceTask.update({
        where: { witId: targetWitId },
        data: { resolvedUserId: assigneeUserId },
      });
    } else {
      const responsible = await resolveTaskResponsible(tx, {
        witId: targetWitId,
        assignmentType: targetTask.assignmentType,
        assignedUserId: targetTask.assignedUserId ?? null,
        assignedRoleId: targetTask.assignedRoleId ?? null,
        dynamicAssignmentType: targetTask.dynamicAssignmentType ?? null,
        ownerUserId: instance.ownerUserId ?? null,
        businessReferenceType: instance.businessReferenceType ?? null,
        businessReferenceId: instance.businessReferenceId ?? null,
        performedBy,
      });

      if (responsible.resolvedUserId) {
        await tx.witWorkflowInstanceTask.update({
          where: { witId: targetWitId },
          data: { resolvedUserId: responsible.resolvedUserId },
        });
      }
    }

    // 7. Write WAL for target task activation
    await tx.walWorkflowAuditLog.create({
      data: {
        winId,
        witId: targetWitId,
        eventType: 'TASK_ACTIVATED',
        performedBy,
        reason,
      },
    });

    return { overriddenCount: tasksToOverride.length, instance };
  });

  // App-level audit record (outside transaction)
  await auditOrchestrator.log({
    entityName: 'win_workflow_instances',
    entityId: winId,
    createdBy: performedBy,
    oldValues: { status: result.instance.status },
    newValues: { targetWitId },
    comment: `Admin task jump to task ${targetWitId}`,
  });

  return { overriddenCount: result.overriddenCount, activatedWitId: targetWitId };
}

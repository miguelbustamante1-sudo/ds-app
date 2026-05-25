import { Prisma, WitWorkflowInstanceTask } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { calculateDueDate } from './components/CalculateDueDate';
import { validateTaskInputs } from './components/ValidateTaskInputs';
import { runRoutingEngine } from './components/RoutingEngine';
import { evaluateJoinCondition } from './components/JoinConditionEvaluator';
import {
  TaskNotActiveError,
  TaskExecutionForbiddenError,
  TaskInputValidationError,
} from './errors';

export interface CompleteTaskInput {
  witId: string;
  outcomeCode: string;
  inputs: Array<{ wiiId: string; value: unknown }>;
  comment?: string | undefined;
  completedBy: string;       // req.user.email
  completedByUserId: string; // req.user.dsUserId.toString()
  isAdmin: boolean;
}

function mapValueToField(
  dataType: string,
  value: unknown,
): {
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: Date | null;
  valueDatetime: Date | null;
} {
  const defaults = {
    valueText: null,
    valueNumber: null,
    valueBoolean: null,
    valueDate: null,
    valueDatetime: null,
  };

  switch (dataType) {
    case 'TEXT':
    case 'SELECT':
      return { ...defaults, valueText: typeof value === 'string' ? value : String(value) };

    case 'NUMBER': {
      const num = typeof value === 'string' ? parseFloat(value) : (value as number);
      return { ...defaults, valueNumber: isFinite(num) ? num : null };
    }

    case 'BOOLEAN':
      return { ...defaults, valueBoolean: typeof value === 'boolean' ? value : null };

    case 'DATE':
      return {
        ...defaults,
        valueDate: typeof value === 'string' ? new Date(value) : null,
      };

    case 'DATETIME':
      return {
        ...defaults,
        valueDatetime: typeof value === 'string' ? new Date(value) : null,
      };

    default:
      return defaults;
  }
}

class TaskCompletionOrchestrator {
  async complete(input: CompleteTaskInput): Promise<WitWorkflowInstanceTask> {
    const {
      witId,
      outcomeCode,
      inputs,
      comment,
      completedBy,
      completedByUserId,
      isAdmin,
    } = input;

    const updatedTask = await prisma.$transaction(async (tx) => {
      // Step 1: Load task
      const task = await tx.witWorkflowInstanceTask.findUnique({
        where: { witId },
      });

      if (!task || task.state !== 'ACTIVE') {
        throw new TaskNotActiveError();
      }

      // Step 2: Authorization
      if (!isAdmin && task.resolvedUserId !== null && task.resolvedUserId !== parseInt(completedByUserId, 10)) {
        throw new TaskExecutionForbiddenError();
      }

      // Step 3: Determine new state from outcome
      let newState: string = 'SUCCESS';

      if (task.wtkId) {
        const outcome = await tx.wtoWorkflowTemplateTaskOutcome.findFirst({
          where: { wtkId: task.wtkId, code: outcomeCode },
        });

        if (!outcome) {
          // Outcome not found in template → FAILED
          newState = 'FAILED';
        } else {
          newState = outcome.isTerminal ? 'SUCCESS' : 'FAILED';
        }
      }
      // If wtkId is null, default to SUCCESS

      // Step 4: Validate inputs
      const validation = await validateTaskInputs(witId, tx, inputs);
      if (!validation.valid) {
        const fieldCodes = validation.errors.map((e) => e.wiiId);
        throw new TaskInputValidationError(
          `Input validation failed: ${validation.errors.map((e) => e.message).join('; ')}`,
          fieldCodes,
        );
      }

      // Step 5: Persist input values — load wii records to map data types
      const wiiRecords = await tx.wiiWorkflowInstanceTaskInput.findMany({
        where: { witId },
      });
      const wiiMap = new Map(wiiRecords.map((w) => [w.wiiId, w]));

      for (const submitted of inputs) {
        const wii = wiiMap.get(submitted.wiiId);
        if (!wii) continue;

        const mapped = mapValueToField(wii.dataType, submitted.value);

        await tx.wivWorkflowInstanceTaskInputValue.create({
          data: {
            witId,
            wiiId: submitted.wiiId,
            attemptNo: task.retryCount + 1,
            valueText: mapped.valueText,
            valueNumber: mapped.valueNumber !== null ? new Prisma.Decimal(mapped.valueNumber) : null,
            valueBoolean: mapped.valueBoolean,
            valueDate: mapped.valueDate,
            valueDatetime: mapped.valueDatetime,
            enteredBy: completedByUserId,
          },
        });
      }

      const now = new Date();

      // Step 6: Update task state
      const completedTask = await tx.witWorkflowInstanceTask.update({
        where: { witId },
        data: {
          state: newState,
          completedAt: now,
          completedBy,
          outcomeCode,
          resultComment: comment ?? null,
          updatedBy: completedByUserId,
          updatedAt: now,
        },
      });

      // Step 7: Propagate routing inputs into instance context
      for (const submitted of inputs) {
        const wii = wiiMap.get(submitted.wiiId);
        if (!wii || !wii.isRoutingInput) continue;

        const mapped = mapValueToField(wii.dataType, submitted.value);

        // Manual find-then-update-or-create because WicWorkflowInstanceContext
        // has @@index([winId, key]) but NOT @@unique — Prisma upsert requires unique.
        const existing = await tx.wicWorkflowInstanceContext.findFirst({
          where: { winId: task.winId, key: wii.code },
        });

        if (existing) {
          await tx.wicWorkflowInstanceContext.update({
            where: { wicId: existing.wicId },
            data: {
              witId: task.witId,
              valueText: mapped.valueText,
              valueNumber: mapped.valueNumber !== null ? new Prisma.Decimal(mapped.valueNumber) : null,
              valueBoolean: mapped.valueBoolean,
              valueDate: mapped.valueDate,
              valueDatetime: mapped.valueDatetime,
              updatedBy: completedByUserId,
              updatedAt: now,
            },
          });
        } else {
          await tx.wicWorkflowInstanceContext.create({
            data: {
              winId: task.winId,
              witId: task.witId,
              key: wii.code,
              valueText: mapped.valueText,
              valueNumber: mapped.valueNumber !== null ? new Prisma.Decimal(mapped.valueNumber) : null,
              valueBoolean: mapped.valueBoolean,
              valueDate: mapped.valueDate,
              valueDatetime: mapped.valueDatetime,
              createdBy: completedByUserId,
            },
          });
        }
      }

      // Step 8: Run routing engine
      const routing = await runRoutingEngine(tx, {
        witId,
        winId: task.winId,
        wtkId: task.wtkId,
        outcomeCode,
      });

      // Step 9: Activate next tasks
      for (const nextWitId of routing.nextWitIds) {
        const join = await evaluateJoinCondition(tx, nextWitId, task.winId);

        if (join.shouldActivate) {
          const nextTask = await tx.witWorkflowInstanceTask.findUnique({
            where: { witId: nextWitId },
            select: { slaDurationHours: true },
          });

          const nextDueAt = calculateDueDate(now, nextTask?.slaDurationHours ?? null);

          await tx.witWorkflowInstanceTask.update({
            where: { witId: nextWitId },
            data: {
              state: 'ACTIVE',
              activatedAt: now,
              dueAt: nextDueAt,
            },
          });

          await tx.walWorkflowAuditLog.create({
            data: {
              winId: task.winId,
              witId: nextWitId,
              eventType: 'TASK_ACTIVATED',
              performedBy: completedBy,
            },
          });
        }
      }

      // Step 10: Write WAL for completed task
      const walEventType = newState === 'SUCCESS' ? 'TASK_COMPLETED' : 'TASK_FAILED';
      await tx.walWorkflowAuditLog.create({
        data: {
          winId: task.winId,
          witId,
          eventType: walEventType,
          oldState: 'ACTIVE',
          newState,
          performedBy: completedBy,
        },
      });

      // Step 11: Check workflow completion
      const remainingCount = await tx.witWorkflowInstanceTask.count({
        where: {
          winId: task.winId,
          state: { in: ['ACTIVE', 'PENDING'] },
        },
      });

      if (remainingCount === 0) {
        const instanceFailed =
          newState === 'FAILED' &&
          !routing.routeFound &&
          task.retryCount >= task.maxRetryCount;

        if (instanceFailed) {
          await tx.winWorkflowInstance.update({
            where: { winId: task.winId },
            data: {
              status: 'FAILED',
              completedAt: now,
              completedBy: completedByUserId,
            },
          });

          await tx.walWorkflowAuditLog.create({
            data: {
              winId: task.winId,
              eventType: 'INSTANCE_FAILED',
              performedBy: completedBy,
            },
          });
        } else {
          await tx.winWorkflowInstance.update({
            where: { winId: task.winId },
            data: {
              status: 'COMPLETED',
              completedAt: now,
              completedBy: completedByUserId,
            },
          });

          await tx.walWorkflowAuditLog.create({
            data: {
              winId: task.winId,
              eventType: 'INSTANCE_COMPLETED',
              performedBy: completedBy,
            },
          });
        }
      }

      return completedTask;
    });

    // App-level audit record (outside transaction)
    await auditOrchestrator.log({
      entityName: 'wit_workflow_instance_tasks',
      entityId: witId,
      createdBy: completedBy,
      oldValues: null,
      newValues: updatedTask as unknown as Record<string, unknown>,
      comment: `Task completed with outcome: ${outcomeCode}`,
    });

    return updatedTask;
  }
}

export const taskCompletionOrchestrator = new TaskCompletionOrchestrator();

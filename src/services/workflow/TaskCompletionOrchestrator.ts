import { Prisma, WitWorkflowInstanceTask } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { calculateDueDate } from './components/CalculateDueDate';
import { validateTaskInputs } from './components/ValidateTaskInputs';
import { runRoutingEngine } from './components/RoutingEngine';
import { evaluateJoinCondition } from './components/JoinConditionEvaluator';
import { resolveTaskResponsible } from './components/ResolveTaskResponsible';
import { getOutcomeHandler } from './components/WorkflowOutcomeRegistry';
import { invokeDatabaseOutcomeProcedure } from './components/InvokeDatabaseOutcomeProcedure';
import { notifyWorkflowEvent } from './components/NotificationDispatcher';
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

    const postCommit: { hook?: (() => Promise<void>) | undefined } = {};
    // Tasks activated by routing below, notified after commit alongside postCommit.hook.
    const activatedAssignments: Array<{ witId: string; userId: number }> = [];
    const activatedFanOut: Array<{ wtaId: string; witId: string; userId: number; roleName: string }> = [];
    const supersededAudit: Array<{
      wtaId: string;
      before: { state: string };
      after: { state: string };
    }> = [];

    const updatedTask = await prisma.$transaction(async (tx) => {
      // Step 1: Load task
      const task = await tx.witWorkflowInstanceTask.findUnique({
        where: { witId },
      });

      if (!task || task.state !== 'ACTIVE') {
        throw new TaskNotActiveError();
      }

      // Step 2: Authorization
      const actorUserId = parseInt(completedByUserId, 10);

      if (!isAdmin && task.resolvedUserId !== null && task.resolvedUserId !== actorUserId) {
        throw new TaskExecutionForbiddenError();
      }

      // A ROLE task has resolvedUserId === null, so the guard above passes for ANY authenticated
      // user. Gate it on fan-out membership instead: only someone holding a PENDING assignee row
      // may act. Loaded once here and reused by the supersede step below.
      const assigneeRows = await tx.wtaWorkflowTaskAssignee.findMany({ where: { witId } });

      if (!isAdmin && task.resolvedUserId === null && assigneeRows.length > 0) {
        const isEligible = assigneeRows.some(
          (row) => row.userId === actorUserId && row.state === 'PENDING',
        );
        if (!isEligible) {
          throw new TaskExecutionForbiddenError();
        }
      }

      // Step 3: Determine new state from outcome
      let newState: string = 'SUCCESS';
      let matchedOutcome: Awaited<ReturnType<typeof tx.wtoWorkflowTemplateTaskOutcome.findFirst>> = null;

      if (task.wtkId) {
        matchedOutcome = await tx.wtoWorkflowTemplateTaskOutcome.findFirst({
          where: { wtkId: task.wtkId, code: outcomeCode },
        });

        if (!matchedOutcome) {
          // Outcome not found in template → FAILED
          newState = 'FAILED';
        } else {
          newState = matchedOutcome.isTerminal ? 'SUCCESS' : 'FAILED';
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

      // Step 6a: Resolve the ROLE fan-out. The actor's row completes; every sibling is
      // superseded. This is what makes "one member acts, resolved for all" true — without it
      // the task would sit in every other member's inbox forever.
      if (assigneeRows.length > 0) {
        await tx.wtaWorkflowTaskAssignee.updateMany({
          where: { witId, userId: actorUserId },
          data: {
            state: 'COMPLETED',
            respondedAt: now,
            outcomeCode,
            updatedBy: completedByUserId,
            updatedAt: now,
          },
        });

        await tx.wtaWorkflowTaskAssignee.updateMany({
          where: { witId, state: 'PENDING', userId: { not: actorUserId } },
          data: {
            state: 'SUPERSEDED',
            updatedBy: completedByUserId,
            updatedAt: now,
          },
        });

        for (const row of assigneeRows) {
          if (row.state !== 'PENDING') continue;
          supersededAudit.push({
            wtaId: row.wtaId,
            before: { state: row.state },
            after: { state: row.userId === actorUserId ? 'COMPLETED' : 'SUPERSEDED' },
          });
        }
      }

      // Step 6b: Run the registered outcome handler for this instance's business
      // entity, if the completed outcome is flagged to trigger it. Runs inside
      // this same transaction so the domain side effect (e.g. flipping a
      // TimeOff's status) is atomic with the task completion — if it throws,
      // the task completion rolls back too.
      const instanceRef = await tx.winWorkflowInstance.findUnique({
        where: { winId: task.winId },
        select: {
          businessReferenceType: true,
          businessReferenceId: true,
          ownerUserId: true,
          template: { select: { executionType: true } },
        },
      });

      if (matchedOutcome?.executionType === 'DATABASE' && matchedOutcome.outcomeProcName) {
        // DATABASE-type outcome: call its configured procedure instead of the TS
        // registry. The procedure also owns routing (spec §4.3) and instance
        // completion (spec §4.3b) for this outcome — nothing downstream in Steps
        // 8/9/11 needs to run for this path (see Task 3 below).
        const activation = await invokeDatabaseOutcomeProcedure(tx, {
          procName: matchedOutcome.outcomeProcName,
          winId: task.winId,
          witId,
          outcomeCode,
          businessReferenceId: instanceRef?.businessReferenceId ?? null,
          performedBy: completedBy,
          performedByUserId: completedByUserId,
          // No domain has adopted DATABASE execution type yet (out of scope for
          // this plan set — see ORCHESTRATOR.md's Objective); a future domain
          // integration may extend this call site to pass richer params.
          params: {},
        });

        // Spec §4.7: feed the same activatedAssignments array Step 9 already
        // populates for CODE-type routing, so the existing post-commit notify
        // loop (below, outside the transaction) dispatches this with no new
        // dispatch code — just a new source for the array.
        if (activation?.activated_wit_id && activation.activated_user_id) {
          activatedAssignments.push({
            witId: activation.activated_wit_id,
            userId: activation.activated_user_id,
          });
        }
      } else if (instanceRef?.businessReferenceType && matchedOutcome?.triggersOutcomeAction) {
        const handler = getOutcomeHandler(instanceRef.businessReferenceType);
        if (handler) {
          postCommit.hook = await handler({
            tx,
            winId: task.winId,
            witId,
            taskCode: task.code,
            outcomeCode,
            businessReferenceId: instanceRef.businessReferenceId ?? '',
            performedBy: completedBy,
            performedByUserId: completedByUserId,
          });
        }
      }

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
            select: {
              slaDurationHours: true,
              assignmentType: true,
              assignedUserId: true,
              assignedRoleId: true,
              dynamicAssignmentType: true,
            },
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

          if (nextTask) {
            const responsible = await resolveTaskResponsible(tx, {
              witId: nextWitId,
              assignmentType: nextTask.assignmentType,
              assignedUserId: nextTask.assignedUserId ?? null,
              assignedRoleId: nextTask.assignedRoleId ?? null,
              dynamicAssignmentType: nextTask.dynamicAssignmentType ?? null,
              ownerUserId: instanceRef?.ownerUserId ?? null,
              businessReferenceType: instanceRef?.businessReferenceType ?? null,
              businessReferenceId: instanceRef?.businessReferenceId ?? null,
              performedBy: completedBy,
            });

            if (responsible.resolvedUserId) {
              await tx.witWorkflowInstanceTask.update({
                where: { witId: nextWitId },
                data: { resolvedUserId: responsible.resolvedUserId },
              });
              activatedAssignments.push({
                witId: nextWitId,
                userId: responsible.resolvedUserId,
              });
            }

            // ROLE fan-out for a task activated by routing — same contract as at
            // instantiation: one assignee row per role member, first responder wins.
            if (responsible.roleName !== null) {
              for (const candidateUserId of responsible.roleCandidateUserIds) {
                const assignee = await tx.wtaWorkflowTaskAssignee.create({
                  data: {
                    witId: nextWitId,
                    userId: candidateUserId,
                    roleName: responsible.roleName,
                    state: 'PENDING',
                    createdBy: completedByUserId,
                  },
                });
                activatedFanOut.push({
                  wtaId: assignee.wtaId,
                  witId: nextWitId,
                  userId: candidateUserId,
                  roleName: responsible.roleName,
                });
              }
            }

            if (responsible.noResponsibleFound) {
              await tx.walWorkflowAuditLog.create({
                data: {
                  winId: task.winId,
                  witId: nextWitId,
                  eventType: 'NO_RESPONSIBLE_FOUND',
                  performedBy: completedBy,
                },
              });
            }
          }

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

    // Post-commit work for the registered outcome handler (if any), e.g. writing
    // a domain-specific changelog/audit entry via the global Prisma client.
    if (postCommit.hook) {
      await postCommit.hook();
    }

    // Notify users assigned to tasks that routing just activated. Post-commit for the same
    // reason as the hook above: if the transaction rolled back, those tasks were never really
    // activated and no notification should have gone out. allSettled so a channel failure
    // cannot turn a completed task into an error response.
    await Promise.allSettled(
      activatedAssignments.map((assignment) =>
        notifyWorkflowEvent({
          witId: assignment.witId,
          eventType: 'ON_ASSIGNMENT',
          recipientUserIds: [assignment.userId.toString()],
        }),
      ),
    );

    // Rule 3.4 — audit each fan-out row created by routing activation.
    for (const row of activatedFanOut) {
      await auditOrchestrator.log({
        entityName: 'wta_workflow_task_assignees',
        entityId: row.wtaId,
        createdBy: completedBy,
        oldValues: null,
        newValues: row,
        comment: `Role '${row.roleName}' fan-out assignee created for workflow task`,
      });
    }

    await Promise.allSettled(
      activatedFanOut.map((row) =>
        notifyWorkflowEvent({
          witId: row.witId,
          eventType: 'ON_ASSIGNMENT',
          recipientUserIds: [row.userId.toString()],
        }),
      ),
    );

    // Rule 3.4 — UPDATE on a ds-schema table requires before/after snapshots.
    for (const row of supersededAudit) {
      await auditOrchestrator.log({
        entityName: 'wta_workflow_task_assignees',
        entityId: row.wtaId,
        createdBy: completedBy,
        oldValues: row.before,
        newValues: row.after,
        comment:
          row.after.state === 'COMPLETED'
            ? 'Role assignee completed the workflow task'
            : 'Role assignee superseded — another member completed the task',
      });
    }

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

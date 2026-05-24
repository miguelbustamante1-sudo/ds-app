import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { WorkflowNotPublishedError } from './errors';
import { calculateDueDate } from './components/CalculateDueDate';
import { resolveEntityContext } from './components/ResolveEntityContext';
import { resolveTaskResponsible } from './components/ResolveTaskResponsible';

interface InstantiateInput {
  wflId: string;
  winName: string;
  businessReferenceType?: string | undefined;
  businessReferenceId?: string | undefined;
  contextJson?: Array<{ key: string; value: string | number | boolean }> | undefined;
  ownerUserId?: string | undefined;
  startedBy: string; // req.user.email
  createdBy: string; // req.user.dsUserId.toString()
}

interface InstantiateResult {
  winId: string;
  activatedTaskIds: string[];
}

export class WorkflowInstantiationOrchestrator {
  async instantiate(input: InstantiateInput): Promise<InstantiateResult> {
    const {
      wflId,
      winName,
      businessReferenceType,
      businessReferenceId,
      contextJson,
      ownerUserId,
      startedBy,
      createdBy,
    } = input;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Load published template with all related data
      const template = await tx.wflWorkflowTemplate.findFirst({
        where: { wflId, status: 'PUBLISHED' },
        include: {
          tasks: {
            where: { isActive: true },
            include: { inputs: true, notifications: true },
          },
          routes: true,
          dependencies: true,
          entityConfig: { include: { entityFields: true } },
        },
      });

      if (!template) {
        throw new WorkflowNotPublishedError();
      }

      // 2. Create the workflow instance
      const instance = await tx.winWorkflowInstance.create({
        data: {
          wflId,
          workflowCode: template.code,
          templateVersionNo: template.versionNo,
          name: winName,
          status: 'ACTIVE',
          startedBy,
          ownerUserId: ownerUserId ?? null,
          businessReferenceType: businessReferenceType ?? null,
          businessReferenceId: businessReferenceId ?? null,
          contextJson: contextJson ? (contextJson as Prisma.InputJsonValue) : Prisma.JsonNull,
          createdBy,
        },
      });

      // 2b. Seed context from contextJson entries
      if (contextJson) {
        for (const entry of contextJson) {
          await tx.wicWorkflowInstanceContext.create({
            data: {
              winId: instance.winId,
              key: entry.key,
              valueText: typeof entry.value === 'string' ? entry.value : null,
              valueNumber: typeof entry.value === 'number' ? entry.value : null,
              valueBoolean: typeof entry.value === 'boolean' ? entry.value : null,
              createdBy,
            },
          });
        }
      }

      // 2c. Seed context from entity config (if applicable)
      if (template.wecId && businessReferenceId && template.entityConfig) {
        const resolved = await resolveEntityContext(
          template.entityConfig.entityType,
          businessReferenceId,
          template.entityConfig.entityFields,
        );
        for (const entry of resolved) {
          await tx.wicWorkflowInstanceContext.create({
            data: {
              winId: instance.winId,
              key: entry.key,
              valueText: entry.valueText,
              valueNumber: entry.valueNumber,
              valueBoolean: entry.valueBoolean,
              valueDate: entry.valueDate,
              valueDatetime: entry.valueDatetime,
              createdBy,
            },
          });
        }
      }

      // 3. Copy tasks and build wtkId → witId map
      const taskMap = new Map<string, string>();

      for (const task of template.tasks) {
        const instanceTask = await tx.witWorkflowInstanceTask.create({
          data: {
            winId: instance.winId,
            wtkId: task.wtkId,
            code: task.code,
            name: task.name,
            description: task.description ?? null,
            sequenceNo: task.sequenceNo ?? null,
            taskType: task.taskType,
            assignmentType: task.assignmentType,
            assignedUserId: task.assignedUserId ?? null,
            assignedRoleId: task.assignedRoleId ?? null,
            dynamicAssignmentType: task.dynamicAssignmentType ?? null,
            priority: task.priority,
            state: 'PENDING',
            slaDurationHours: task.slaDurationHours ?? null,
            maxRetryCount: task.maxRetryCount,
            escalationUserId: task.escalationUserId ?? null,
            escalationRoleId: task.escalationRoleId ?? null,
            escalationDynamicType: task.escalationDynamicType ?? null,
            createdBy,
          },
        });
        taskMap.set(task.wtkId, instanceTask.witId);
      }

      // 4. Copy inputs for each task
      for (const task of template.tasks) {
        const witId = taskMap.get(task.wtkId);
        if (!witId) continue;

        for (const input of task.inputs) {
          await tx.wiiWorkflowInstanceTaskInput.create({
            data: {
              witId,
              wtiId: input.wtiId,
              code: input.code,
              label: input.label,
              description: input.description ?? null,
              dataType: input.dataType,
              isRequired: input.isRequired,
              isRoutingInput: input.isRoutingInput,
              displayOrder: input.displayOrder,
              defaultValue: input.defaultValue ?? null,
              validationRule: input.validationRule ?? null,
              optionSetJson: input.optionSetJson ?? Prisma.JsonNull,
              createdBy,
            },
          });
        }
      }

      // 5. Copy dependencies, translating template task IDs to instance task IDs
      for (const dep of template.dependencies) {
        const witPredId = taskMap.get(dep.wtkPredecessorId);
        const witSuccId = taskMap.get(dep.wtkSuccessorId);
        if (!witPredId || !witSuccId) continue; // skip if template task was not copied

        await tx.widWorkflowInstanceTaskDependency.create({
          data: {
            winId: instance.winId,
            witPredecessorId: witPredId,
            witSuccessorId: witSuccId,
            dependencyType: dep.dependencyType,
            joinGroupCode: dep.joinGroupCode ?? null,
            isRequired: dep.isRequired,
            createdBy,
          },
        });
      }

      // 6. Copy notifications, translating wtkId → witId
      for (const task of template.tasks) {
        const witId = taskMap.get(task.wtkId);
        if (!witId) continue;

        for (const notification of task.notifications) {
          await tx.wntWorkflowInstanceNotification.create({
            data: {
              witId,
              eventType: notification.eventType,
              recipientType: notification.recipientType,
              recipientUserId: notification.recipientUserId ?? null,
              recipientRoleId: notification.recipientRoleId ?? null,
              recipientDynamicType: notification.recipientDynamicType ?? null,
              messageTemplate: notification.messageTemplate,
              emailTemplate: notification.emailTemplate ?? null,
              createdBy,
            },
          });
        }
      }

      // 7. Activate starting tasks
      const activatedTaskIds: string[] = [];
      const now = new Date();

      for (const task of template.tasks) {
        if (!task.isStartingTask) continue;

        const witId = taskMap.get(task.wtkId);
        if (!witId) continue;

        const dueAt = calculateDueDate(now, task.slaDurationHours ?? null);

        await tx.witWorkflowInstanceTask.update({
          where: { witId },
          data: { state: 'ACTIVE', activatedAt: now, dueAt },
        });

        activatedTaskIds.push(witId);

        // Resolve responsible for the activated task
        const responsible = await resolveTaskResponsible(tx, {
          witId,
          assignmentType: task.assignmentType,
          assignedUserId: task.assignedUserId ?? null,
          assignedRoleId: task.assignedRoleId ?? null,
          dynamicAssignmentType: task.dynamicAssignmentType ?? null,
          ownerUserId: ownerUserId ?? null,
          performedBy: startedBy,
        });

        if (responsible.resolvedUserId) {
          await tx.witWorkflowInstanceTask.update({
            where: { witId },
            data: { resolvedUserId: responsible.resolvedUserId },
          });
        }

        if (responsible.noResponsibleFound) {
          await tx.walWorkflowAuditLog.create({
            data: {
              winId: instance.winId,
              witId,
              eventType: 'NO_RESPONSIBLE_FOUND',
              performedBy: startedBy,
            },
          });
        }

        await tx.walWorkflowAuditLog.create({
          data: {
            winId: instance.winId,
            witId,
            eventType: 'TASK_ACTIVATED',
            performedBy: startedBy,
          },
        });
      }

      // 8. Write INSTANCE_STARTED audit log inside the transaction
      await tx.walWorkflowAuditLog.create({
        data: {
          winId: instance.winId,
          eventType: 'INSTANCE_STARTED',
          performedBy: startedBy,
        },
      });

      return { instance, activatedTaskIds };
    });

    // App-level audit record (outside transaction)
    await auditOrchestrator.log({
      entityName: 'win_workflow_instances',
      entityId: result.instance.winId,
      createdBy: startedBy,
      oldValues: null,
      newValues: result.instance as unknown as Record<string, unknown>,
      comment: 'Workflow instance started',
    });

    return { winId: result.instance.winId, activatedTaskIds: result.activatedTaskIds };
  }
}

export const workflowInstantiationOrchestrator = new WorkflowInstantiationOrchestrator();

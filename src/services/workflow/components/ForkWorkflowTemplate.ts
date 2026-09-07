import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { WorkflowNotFoundError, WorkflowNotPublishedError } from '../errors';

/**
 * Deep-copies a PUBLISHED template into a new DRAFT version: tasks, inputs,
 * outcomes, notifications, routes, and dependencies all get fresh ids, with
 * every cross-reference (routes' wtkFromId/wtkToId/wtoId, dependencies'
 * wtkPredecessorId/wtkSuccessorId) rewired to the new copies. The source
 * template is never touched, so in-flight instances keep resolving against it.
 */
export async function forkWorkflowTemplate(wflId: string, userId: string, userEmail: string) {
  const source = await prisma.wflWorkflowTemplate.findUnique({
    where: { wflId },
    include: {
      tasks: {
        where: { isActive: true },
        include: { inputs: true, outcomes: true, notifications: true },
      },
      routes: true,
      dependencies: true,
    },
  });

  if (source === null) throw new WorkflowNotFoundError();
  if (source.status !== 'PUBLISHED') {
    throw new WorkflowNotPublishedError('Only published templates can be forked into a new draft version');
  }

  const forked = await prisma.$transaction(async (tx) => {
    const maxVersion = await tx.wflWorkflowTemplate.aggregate({
      where: { code: source.code },
      _max: { versionNo: true },
    });
    const newVersionNo = (maxVersion._max.versionNo ?? source.versionNo) + 1;

    const newTemplate = await tx.wflWorkflowTemplate.create({
      data: {
        code: source.code,
        name: source.name,
        description: source.description,
        versionNo: newVersionNo,
        status: 'DRAFT',
        wecId: source.wecId,
        createdBy: userId,
      },
    });

    const taskIdMap = new Map<string, string>();
    const outcomeIdMap = new Map<string, string>();

    for (const task of source.tasks) {
      const newTask = await tx.wtkWorkflowTemplateTask.create({
        data: {
          wflId: newTemplate.wflId,
          code: task.code,
          name: task.name,
          description: task.description,
          sequenceNo: task.sequenceNo,
          taskType: task.taskType,
          assignmentType: task.assignmentType,
          assignedUserId: task.assignedUserId,
          assignedRoleId: task.assignedRoleId,
          dynamicAssignmentType: task.dynamicAssignmentType,
          priority: task.priority,
          slaDurationHours: task.slaDurationHours,
          escalationUserId: task.escalationUserId,
          escalationRoleId: task.escalationRoleId,
          escalationDynamicType: task.escalationDynamicType,
          maxRetryCount: task.maxRetryCount,
          allowReassignment: task.allowReassignment,
          requireCommentOnReassign: task.requireCommentOnReassign,
          allowFail: task.allowFail,
          isStartingTask: task.isStartingTask,
          createdBy: userId,
        },
      });
      taskIdMap.set(task.wtkId, newTask.wtkId);
    }

    for (const task of source.tasks) {
      const newWtkId = taskIdMap.get(task.wtkId);
      if (!newWtkId) continue;

      for (const input of task.inputs) {
        await tx.wtiWorkflowTemplateTaskInput.create({
          data: {
            wtkId: newWtkId,
            code: input.code,
            label: input.label,
            description: input.description,
            dataType: input.dataType,
            isRequired: input.isRequired,
            isRoutingInput: input.isRoutingInput,
            displayOrder: input.displayOrder,
            defaultValue: input.defaultValue,
            validationRule: input.validationRule,
            optionSetJson: input.optionSetJson ?? Prisma.JsonNull,
            createdBy: userId,
          },
        });
      }

      for (const outcome of task.outcomes) {
        const newOutcome = await tx.wtoWorkflowTemplateTaskOutcome.create({
          data: {
            wtkId: newWtkId,
            code: outcome.code,
            label: outcome.label,
            description: outcome.description,
            isTerminal: outcome.isTerminal,
            triggersOutcomeAction: outcome.triggersOutcomeAction,
            createdBy: userId,
          },
        });
        outcomeIdMap.set(outcome.wtoId, newOutcome.wtoId);
      }

      for (const notification of task.notifications) {
        await tx.wtnWorkflowTemplateNotification.create({
          data: {
            wtkId: newWtkId,
            eventType: notification.eventType,
            recipientType: notification.recipientType,
            recipientUserId: notification.recipientUserId,
            recipientRoleId: notification.recipientRoleId,
            recipientDynamicType: notification.recipientDynamicType,
            messageTemplate: notification.messageTemplate,
            emailTemplate: notification.emailTemplate,
            slackTemplate: notification.slackTemplate,
            isActive: notification.isActive,
            createdBy: userId,
          },
        });
      }
    }

    for (const route of source.routes) {
      const newWtkFromId = taskIdMap.get(route.wtkFromId);
      const newWtkToId = taskIdMap.get(route.wtkToId);
      if (!newWtkFromId || !newWtkToId) continue;

      await tx.wtrWorkflowTemplateRoute.create({
        data: {
          wflId: newTemplate.wflId,
          wtkFromId: newWtkFromId,
          wtkToId: newWtkToId,
          wtoId: route.wtoId ? (outcomeIdMap.get(route.wtoId) ?? null) : null,
          conditionType: route.conditionType,
          routeOrder: route.routeOrder,
          createdBy: userId,
        },
      });
    }

    for (const dep of source.dependencies) {
      const newPredId = taskIdMap.get(dep.wtkPredecessorId);
      const newSuccId = taskIdMap.get(dep.wtkSuccessorId);
      if (!newPredId || !newSuccId) continue;

      await tx.wtdWorkflowTemplateDependency.create({
        data: {
          wflId: newTemplate.wflId,
          wtkPredecessorId: newPredId,
          wtkSuccessorId: newSuccId,
          dependencyType: dep.dependencyType,
          joinGroupCode: dep.joinGroupCode,
          isRequired: dep.isRequired,
          createdBy: userId,
        },
      });
    }

    return newTemplate;
  });

  await auditOrchestrator.log({
    entityName: 'wfl_workflow_templates',
    entityId: forked.wflId,
    createdBy: userEmail,
    oldValues: null,
    newValues: forked as unknown as Record<string, unknown>,
    comment: `Workflow template forked from published v${source.versionNo} into new draft v${forked.versionNo}`,
  });

  return forked;
}

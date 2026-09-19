import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { buildTemplateSnapshot } from './components/BuildTemplateSnapshot';
import { forkWorkflowTemplate } from './components/ForkWorkflowTemplate';
import { validateTemplateCode } from './components/ValidateTemplateCode';
import { validateRoutingExpressions } from './components/ValidateRoutingExpressions';
import { validateTaskRoutes } from './components/ValidateTaskRoutes';
import { validateTaskDependencies } from './components/ValidateTaskDependencies';
import { validateExecutionType } from './components/ValidateExecutionType';
import {
  WorkflowNotFoundError,
  WorkflowNotDraftError,
  WorkflowMissingStartTaskError,
} from './errors';
import { AppError } from '../../errors/AppError';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateTemplateInput {
  code: string;
  name: string;
  description?: string;
  versionNo: number;
  wecId?: string;
  // Arrives from the route as a date-only string (e.g. "2026-08-01") or null —
  // typed loosely here to reflect that, rather than lying that it's already a Date.
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  executionType?: 'CODE' | 'DATABASE';
  instantiateProcName?: string | null;
}

interface UpdateTemplateInput {
  name?: string;
  description?: string;
  versionNo?: number;
  wecId?: string;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  executionType?: 'CODE' | 'DATABASE';
  instantiateProcName?: string | null;
}

/**
 * Prisma's query engine requires a full ISO-8601 DateTime, not a bare
 * date-only string like "2026-08-01" — passing one through as-is throws
 * "premature end of input. Expected ISO-8601 DateTime". Converts to a real
 * Date (or passes null through) before it reaches Prisma.
 */
function toDateOrNull(value: Date | string | null): Date | null {
  if (value === null) return null;
  return value instanceof Date ? value : new Date(value);
}

interface ListTemplatesFilters {
  code?: string;
  status?: string;
  isActive?: boolean;
}

interface AddTaskInput {
  code: string;
  name: string;
  description?: string;
  sequenceNo?: number;
  taskType: string;
  assignmentType: string;
  assignedUserId?: number;
  assignedRoleId?: string;
  dynamicAssignmentType?: string;
  priority: string;
  slaDurationHours?: number;
  escalationUserId?: number;
  escalationRoleId?: string;
  escalationDynamicType?: string;
  maxRetryCount?: number;
  allowReassignment?: boolean;
  requireCommentOnReassign?: boolean;
  allowFail?: boolean;
  isStartingTask?: boolean;
}

interface UpdateTaskInput {
  code?: string;
  name?: string;
  description?: string;
  sequenceNo?: number;
  taskType?: string;
  assignmentType?: string;
  assignedUserId?: number;
  assignedRoleId?: string;
  dynamicAssignmentType?: string;
  priority?: string;
  slaDurationHours?: number;
  escalationUserId?: number;
  escalationRoleId?: string;
  escalationDynamicType?: string;
  maxRetryCount?: number;
  allowReassignment?: boolean;
  requireCommentOnReassign?: boolean;
  allowFail?: boolean;
  isStartingTask?: boolean;
}

interface AddInputInput {
  code: string;
  label: string;
  description?: string;
  dataType: string;
  isRequired?: boolean;
  isRoutingInput?: boolean;
  displayOrder?: number;
  defaultValue?: string;
  validationRule?: string;
  optionSetJson?: Prisma.InputJsonValue;
}

interface UpdateInputInput {
  code?: string;
  label?: string;
  description?: string;
  dataType?: string;
  isRequired?: boolean;
  isRoutingInput?: boolean;
  displayOrder?: number;
  defaultValue?: string;
  validationRule?: string;
  optionSetJson?: Prisma.InputJsonValue;
}

interface AddOutcomeInput {
  code: string;
  label: string;
  description?: string;
  isTerminal?: boolean;
  triggersOutcomeAction?: boolean;
  executionType?: 'CODE' | 'DATABASE';
  outcomeProcName?: string | null;
}

interface AddRouteInput {
  wtkFromId: string;
  wtoId?: string;
  wtkToId: string;
  conditionType: string;
  routeOrder?: number;
}

interface AddDependencyInput {
  wtkPredecessorId: string;
  wtkSuccessorId: string;
  dependencyType: string;
  joinGroupCode?: string;
  isRequired?: boolean;
}

interface AddNotificationInput {
  eventType: string;
  recipientType: string;
  recipientUserId?: number;
  recipientRoleId?: string;
  recipientDynamicType?: string;
  messageTemplate: string;
  emailTemplate?: string;
  slackTemplate?: string;
  isActive?: boolean;
}

interface UpdateNotificationInput {
  eventType?: string;
  recipientType?: string;
  recipientUserId?: number;
  recipientRoleId?: string;
  recipientDynamicType?: string;
  messageTemplate?: string;
  emailTemplate?: string;
  slackTemplate?: string;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireDraftTemplate(wflId: string) {
  const template = await prisma.wflWorkflowTemplate.findUnique({
    where: { wflId },
    select: { wflId: true, status: true },
  });
  if (template === null) throw new WorkflowNotFoundError();
  if (template.status !== 'DRAFT') throw new WorkflowNotDraftError();
  return template;
}

/**
 * Looser gate for mutations that are safe on a PUBLISHED template because the
 * data involved is copied into instance-scoped tables at instantiation time
 * (tasks, inputs, notifications, dependencies) rather than re-read live from
 * the template while an instance is running. Routes and outcome deletion stay
 * on requireDraftTemplate — RoutingEngine and TaskCompletionOrchestrator read
 * those live against every in-flight instance, so editing them post-publish
 * can break a running workflow. ARCHIVED templates are never editable.
 */
async function requireEditableTemplate(wflId: string) {
  const template = await prisma.wflWorkflowTemplate.findUnique({
    where: { wflId },
    select: { wflId: true, status: true },
  });
  if (template === null) throw new WorkflowNotFoundError();
  if (template.status !== 'DRAFT' && template.status !== 'PUBLISHED') {
    throw new WorkflowNotDraftError('Template must be in DRAFT or PUBLISHED state to be edited');
  }
  return template;
}

async function requireTemplate(wflId: string) {
  const template = await prisma.wflWorkflowTemplate.findUnique({
    where: { wflId },
    select: { wflId: true, status: true },
  });
  if (template === null) throw new WorkflowNotFoundError();
  return template;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export class WorkflowTemplateOrchestrator {
  // -------------------------------------------------------------------------
  // Templates
  // -------------------------------------------------------------------------

  async createTemplate(data: CreateTemplateInput, userId: string, userEmail: string) {
    await validateTemplateCode(data.code, data.versionNo);

    const record = await prisma.wflWorkflowTemplate.create({
      data: {
        code: data.code,
        name: data.name,
        versionNo: data.versionNo,
        status: 'DRAFT',
        createdBy: userId,
        ...(data.description !== undefined && { description: data.description }),
        ...(data.wecId !== undefined && { wecId: data.wecId }),
        ...(data.effectiveFrom !== undefined && { effectiveFrom: toDateOrNull(data.effectiveFrom) }),
        ...(data.effectiveTo !== undefined && { effectiveTo: toDateOrNull(data.effectiveTo) }),
        ...(data.executionType !== undefined && { executionType: data.executionType }),
        ...(data.instantiateProcName !== undefined && { instantiateProcName: data.instantiateProcName }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wfl_workflow_templates',
      entityId: record.wflId,
      createdBy: userEmail,
      oldValues: null,
      newValues: record as unknown as Record<string, unknown>,
      comment: 'Workflow template created',
    });

    return record;
  }

  async getTemplate(wflId: string) {
    const template = await buildTemplateSnapshot(wflId);
    if (template === null) throw new WorkflowNotFoundError();
    return template;
  }

  async listTemplates(filters?: ListTemplatesFilters) {
    return prisma.wflWorkflowTemplate.findMany({
      where: {
        ...(filters?.code !== undefined && { code: filters.code }),
        ...(filters?.status !== undefined && { status: filters.status }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: [{ code: 'asc' }, { versionNo: 'asc' }],
    });
  }

  async updateTemplate(
    wflId: string,
    data: UpdateTemplateInput,
    userId: string,
    userEmail: string,
  ) {
    const existing = await prisma.wflWorkflowTemplate.findUnique({ where: { wflId } });
    if (existing === null) throw new WorkflowNotFoundError();
    if (existing.status !== 'DRAFT') throw new WorkflowNotDraftError();

    if (data.versionNo !== undefined && data.versionNo !== existing.versionNo) {
      await validateTemplateCode(existing.code, data.versionNo, wflId);
    }

    const updated = await prisma.wflWorkflowTemplate.update({
      where: { wflId },
      data: {
        updatedBy: userId,
        updatedAt: new Date(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.versionNo !== undefined && { versionNo: data.versionNo }),
        ...(data.wecId !== undefined && { wecId: data.wecId }),
        ...(data.effectiveFrom !== undefined && { effectiveFrom: toDateOrNull(data.effectiveFrom) }),
        ...(data.effectiveTo !== undefined && { effectiveTo: toDateOrNull(data.effectiveTo) }),
        ...(data.executionType !== undefined && { executionType: data.executionType }),
        ...(data.instantiateProcName !== undefined && { instantiateProcName: data.instantiateProcName }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wfl_workflow_templates',
      entityId: wflId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Workflow template updated',
    });

    return updated;
  }

  async publishTemplate(wflId: string, userId: string, userEmail: string) {
    const existing = await prisma.wflWorkflowTemplate.findUnique({ where: { wflId } });
    if (existing === null) throw new WorkflowNotFoundError();
    if (existing.status !== 'DRAFT') throw new WorkflowNotDraftError();

    const startingTask = await prisma.wtkWorkflowTemplateTask.findFirst({
      where: { wflId, isStartingTask: true, isActive: true },
      select: { wtkId: true },
    });
    if (startingTask === null) throw new WorkflowMissingStartTaskError();

    await validateRoutingExpressions(wflId);
    await validateExecutionType(wflId);

    const now = new Date();

    // Callers that start a workflow instance resolve the template to use by
    // `code` + status PUBLISHED with no tiebreaker (see StartExceptionAuthorization),
    // so at most one PUBLISHED row per code can exist at a time. Auto-archive any
    // sibling this publish would otherwise leave in a conflicting PUBLISHED state.
    const { updated, archivedSiblings } = await prisma.$transaction(async (tx) => {
      const siblings = await tx.wflWorkflowTemplate.findMany({
        where: { code: existing.code, status: 'PUBLISHED', wflId: { not: wflId } },
      });

      const archivedSiblings: { before: (typeof siblings)[number]; after: (typeof siblings)[number] }[] = [];
      for (const sibling of siblings) {
        const archived = await tx.wflWorkflowTemplate.update({
          where: { wflId: sibling.wflId },
          data: { status: 'ARCHIVED', effectiveTo: now, updatedBy: userId, updatedAt: now },
        });
        archivedSiblings.push({ before: sibling, after: archived });
      }

      const updated = await tx.wflWorkflowTemplate.update({
        where: { wflId },
        data: {
          status: 'PUBLISHED',
          updatedBy: userId,
          updatedAt: now,
          ...(existing.effectiveFrom === null && { effectiveFrom: now }),
        },
      });

      return { updated, archivedSiblings };
    });

    await auditOrchestrator.log({
      entityName: 'wfl_workflow_templates',
      entityId: wflId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Workflow template published',
    });

    for (const { before, after } of archivedSiblings) {
      await auditOrchestrator.log({
        entityName: 'wfl_workflow_templates',
        entityId: before.wflId,
        createdBy: userEmail,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: after as unknown as Record<string, unknown>,
        comment: `Workflow template auto-archived — superseded by v${updated.versionNo}`,
      });
    }

    return updated;
  }

  async forkTemplate(wflId: string, userId: string, userEmail: string) {
    return forkWorkflowTemplate(wflId, userId, userEmail);
  }

  async archiveTemplate(wflId: string, userId: string, userEmail: string) {
    const existing = await prisma.wflWorkflowTemplate.findUnique({ where: { wflId } });
    if (existing === null) throw new WorkflowNotFoundError();

    const now = new Date();
    const updated = await prisma.wflWorkflowTemplate.update({
      where: { wflId },
      data: {
        status: 'ARCHIVED',
        effectiveTo: now,
        updatedBy: userId,
        updatedAt: now,
      },
    });

    await auditOrchestrator.log({
      entityName: 'wfl_workflow_templates',
      entityId: wflId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Workflow template archived',
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------------------

  async addTask(wflId: string, data: AddTaskInput, userId: string, userEmail: string) {
    await requireEditableTemplate(wflId);

    const task = await prisma.wtkWorkflowTemplateTask.create({
      data: {
        wflId,
        code: data.code,
        name: data.name,
        taskType: data.taskType,
        assignmentType: data.assignmentType,
        priority: data.priority,
        createdBy: userId,
        ...(data.description !== undefined && { description: data.description }),
        ...(data.sequenceNo !== undefined && { sequenceNo: data.sequenceNo }),
        ...(data.assignedUserId !== undefined && { assignedUserId: data.assignedUserId }),
        ...(data.assignedRoleId !== undefined && { assignedRoleId: data.assignedRoleId }),
        ...(data.dynamicAssignmentType !== undefined && { dynamicAssignmentType: data.dynamicAssignmentType }),
        ...(data.slaDurationHours !== undefined && { slaDurationHours: data.slaDurationHours }),
        ...(data.escalationUserId !== undefined && { escalationUserId: data.escalationUserId }),
        ...(data.escalationRoleId !== undefined && { escalationRoleId: data.escalationRoleId }),
        ...(data.escalationDynamicType !== undefined && { escalationDynamicType: data.escalationDynamicType }),
        ...(data.maxRetryCount !== undefined && { maxRetryCount: data.maxRetryCount }),
        ...(data.allowReassignment !== undefined && { allowReassignment: data.allowReassignment }),
        ...(data.requireCommentOnReassign !== undefined && { requireCommentOnReassign: data.requireCommentOnReassign }),
        ...(data.allowFail !== undefined && { allowFail: data.allowFail }),
        ...(data.isStartingTask !== undefined && { isStartingTask: data.isStartingTask }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wtk_workflow_template_tasks',
      entityId: task.wtkId,
      createdBy: userEmail,
      oldValues: null,
      newValues: task as unknown as Record<string, unknown>,
      comment: 'Task added to workflow template',
    });

    return task;
  }

  async updateTask(
    wflId: string,
    wtkId: string,
    data: UpdateTaskInput,
    userId: string,
    userEmail: string,
  ) {
    await requireEditableTemplate(wflId);

    const existing = await prisma.wtkWorkflowTemplateTask.findFirst({
      where: { wtkId, wflId },
    });
    if (existing === null) throw new AppError('Task not found in this template', 404);

    const updated = await prisma.wtkWorkflowTemplateTask.update({
      where: { wtkId },
      data: {
        updatedBy: userId,
        updatedAt: new Date(),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.sequenceNo !== undefined && { sequenceNo: data.sequenceNo }),
        ...(data.taskType !== undefined && { taskType: data.taskType }),
        ...(data.assignmentType !== undefined && { assignmentType: data.assignmentType }),
        ...(data.assignedUserId !== undefined && { assignedUserId: data.assignedUserId }),
        ...(data.assignedRoleId !== undefined && { assignedRoleId: data.assignedRoleId }),
        ...(data.dynamicAssignmentType !== undefined && { dynamicAssignmentType: data.dynamicAssignmentType }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.slaDurationHours !== undefined && { slaDurationHours: data.slaDurationHours }),
        ...(data.escalationUserId !== undefined && { escalationUserId: data.escalationUserId }),
        ...(data.escalationRoleId !== undefined && { escalationRoleId: data.escalationRoleId }),
        ...(data.escalationDynamicType !== undefined && { escalationDynamicType: data.escalationDynamicType }),
        ...(data.maxRetryCount !== undefined && { maxRetryCount: data.maxRetryCount }),
        ...(data.allowReassignment !== undefined && { allowReassignment: data.allowReassignment }),
        ...(data.requireCommentOnReassign !== undefined && { requireCommentOnReassign: data.requireCommentOnReassign }),
        ...(data.allowFail !== undefined && { allowFail: data.allowFail }),
        ...(data.isStartingTask !== undefined && { isStartingTask: data.isStartingTask }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wtk_workflow_template_tasks',
      entityId: wtkId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Task updated in workflow template',
    });

    return updated;
  }

  async removeTask(wflId: string, wtkId: string, userId: string, userEmail: string) {
    await requireDraftTemplate(wflId);

    const existing = await prisma.wtkWorkflowTemplateTask.findFirst({
      where: { wtkId, wflId },
    });
    if (existing === null) throw new AppError('Task not found in this template', 404);

    const updated = await prisma.wtkWorkflowTemplateTask.update({
      where: { wtkId },
      data: { isActive: false, updatedBy: userId, updatedAt: new Date() },
    });

    await auditOrchestrator.log({
      entityName: 'wtk_workflow_template_tasks',
      entityId: wtkId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Task removed from workflow template',
    });
  }

  // -------------------------------------------------------------------------
  // Inputs
  // -------------------------------------------------------------------------

  async addInput(
    wflId: string,
    wtkId: string,
    data: AddInputInput,
    userId: string,
    userEmail: string,
  ) {
    await requireEditableTemplate(wflId);

    const task = await prisma.wtkWorkflowTemplateTask.findFirst({
      where: { wtkId, wflId },
      select: { wtkId: true },
    });
    if (task === null) throw new AppError('Task not found in this template', 404);

    const input = await prisma.wtiWorkflowTemplateTaskInput.create({
      data: {
        wtkId,
        code: data.code,
        label: data.label,
        dataType: data.dataType,
        createdBy: userId,
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.isRoutingInput !== undefined && { isRoutingInput: data.isRoutingInput }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.defaultValue !== undefined && { defaultValue: data.defaultValue }),
        ...(data.validationRule !== undefined && { validationRule: data.validationRule }),
        ...(data.optionSetJson !== undefined && { optionSetJson: data.optionSetJson }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wti_workflow_template_task_inputs',
      entityId: input.wtiId,
      createdBy: userEmail,
      oldValues: null,
      newValues: input as unknown as Record<string, unknown>,
      comment: 'Input added to workflow task',
    });

    return input;
  }

  async updateInput(
    wflId: string,
    wtkId: string,
    wtiId: string,
    data: UpdateInputInput,
    userId: string,
    userEmail: string,
  ) {
    await requireEditableTemplate(wflId);

    const existing = await prisma.wtiWorkflowTemplateTaskInput.findFirst({
      where: { wtiId, wtkId, task: { wflId } },
    });
    if (existing === null) throw new AppError('Input not found in this task', 404);

    const updated = await prisma.wtiWorkflowTemplateTaskInput.update({
      where: { wtiId },
      data: {
        ...(data.code !== undefined && { code: data.code }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dataType !== undefined && { dataType: data.dataType }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.isRoutingInput !== undefined && { isRoutingInput: data.isRoutingInput }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.defaultValue !== undefined && { defaultValue: data.defaultValue }),
        ...(data.validationRule !== undefined && { validationRule: data.validationRule }),
        ...(data.optionSetJson !== undefined && { optionSetJson: data.optionSetJson }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wti_workflow_template_task_inputs',
      entityId: wtiId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Input updated in workflow task',
    });

    return updated;
  }

  async removeInput(
    wflId: string,
    wtkId: string,
    wtiId: string,
    userId: string,
    userEmail: string,
  ) {
    await requireEditableTemplate(wflId);

    const existing = await prisma.wtiWorkflowTemplateTaskInput.findFirst({
      where: { wtiId, wtkId, task: { wflId } },
    });
    if (existing === null) throw new AppError('Input not found in this task', 404);

    await prisma.wtiWorkflowTemplateTaskInput.delete({ where: { wtiId } });

    await auditOrchestrator.log({
      entityName: 'wti_workflow_template_task_inputs',
      entityId: wtiId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: null,
      comment: 'Input removed from workflow task',
    });

    // suppress unused-variable lint — userId param kept for API consistency
    void userId;
  }

  // -------------------------------------------------------------------------
  // Outcomes
  // -------------------------------------------------------------------------

  async addOutcome(
    wflId: string,
    wtkId: string,
    data: AddOutcomeInput,
    userId: string,
    userEmail: string,
  ) {
    await requireEditableTemplate(wflId);

    const task = await prisma.wtkWorkflowTemplateTask.findFirst({
      where: { wtkId, wflId },
      select: { wtkId: true },
    });
    if (task === null) throw new AppError('Task not found in this template', 404);

    const outcome = await prisma.wtoWorkflowTemplateTaskOutcome.create({
      data: {
        wtkId,
        code: data.code,
        label: data.label,
        createdBy: userId,
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isTerminal !== undefined && { isTerminal: data.isTerminal }),
        ...(data.triggersOutcomeAction !== undefined && {
          triggersOutcomeAction: data.triggersOutcomeAction,
        }),
        ...(data.executionType !== undefined && { executionType: data.executionType }),
        ...(data.outcomeProcName !== undefined && { outcomeProcName: data.outcomeProcName }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wto_workflow_template_task_outcomes',
      entityId: outcome.wtoId,
      createdBy: userEmail,
      oldValues: null,
      newValues: outcome as unknown as Record<string, unknown>,
      comment: 'Outcome added to workflow task',
    });

    return outcome;
  }

  async removeOutcome(
    wflId: string,
    wtkId: string,
    wtoId: string,
    userId: string,
    userEmail: string,
  ) {
    await requireDraftTemplate(wflId);

    const existing = await prisma.wtoWorkflowTemplateTaskOutcome.findFirst({
      where: { wtoId, wtkId, task: { wflId } },
    });
    if (existing === null) throw new AppError('Outcome not found in this task', 404);

    await prisma.wtoWorkflowTemplateTaskOutcome.delete({ where: { wtoId } });

    await auditOrchestrator.log({
      entityName: 'wto_workflow_template_task_outcomes',
      entityId: wtoId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: null,
      comment: 'Outcome removed from workflow task',
    });

    void userId;
  }

  // -------------------------------------------------------------------------
  // Routes
  // -------------------------------------------------------------------------

  async addRoute(wflId: string, data: AddRouteInput, userId: string, userEmail: string) {
    await requireDraftTemplate(wflId);
    await validateTaskRoutes(wflId, data.wtkFromId, data.wtkToId);

    const route = await prisma.wtrWorkflowTemplateRoute.create({
      data: {
        wflId,
        wtkFromId: data.wtkFromId,
        wtkToId: data.wtkToId,
        conditionType: data.conditionType,
        createdBy: userId,
        ...(data.wtoId !== undefined && { wtoId: data.wtoId }),
        ...(data.routeOrder !== undefined && { routeOrder: data.routeOrder }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wtr_workflow_template_routes',
      entityId: route.wtrId,
      createdBy: userEmail,
      oldValues: null,
      newValues: route as unknown as Record<string, unknown>,
      comment: 'Route added to workflow template',
    });

    return route;
  }

  async removeRoute(wflId: string, wtrId: string, userId: string, userEmail: string) {
    await requireDraftTemplate(wflId);

    const existing = await prisma.wtrWorkflowTemplateRoute.findFirst({
      where: { wtrId, wflId },
    });
    if (existing === null) throw new AppError('Route not found in this template', 404);

    await prisma.wtrWorkflowTemplateRoute.delete({ where: { wtrId } });

    await auditOrchestrator.log({
      entityName: 'wtr_workflow_template_routes',
      entityId: wtrId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: null,
      comment: 'Route removed from workflow template',
    });

    void userId;
  }

  // -------------------------------------------------------------------------
  // Dependencies
  // -------------------------------------------------------------------------

  async addDependency(
    wflId: string,
    data: AddDependencyInput,
    userId: string,
    userEmail: string,
  ) {
    await requireEditableTemplate(wflId);
    await validateTaskDependencies(wflId, data.wtkPredecessorId, data.wtkSuccessorId);

    const dependency = await prisma.wtdWorkflowTemplateDependency.create({
      data: {
        wflId,
        wtkPredecessorId: data.wtkPredecessorId,
        wtkSuccessorId: data.wtkSuccessorId,
        dependencyType: data.dependencyType,
        createdBy: userId,
        ...(data.joinGroupCode !== undefined && { joinGroupCode: data.joinGroupCode }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wtd_workflow_template_dependencies',
      entityId: dependency.wtdId,
      createdBy: userEmail,
      oldValues: null,
      newValues: dependency as unknown as Record<string, unknown>,
      comment: 'Dependency added to workflow template',
    });

    return dependency;
  }

  async removeDependency(wflId: string, wtdId: string, userId: string, userEmail: string) {
    await requireEditableTemplate(wflId);

    const existing = await prisma.wtdWorkflowTemplateDependency.findFirst({
      where: { wtdId, wflId },
    });
    if (existing === null) throw new AppError('Dependency not found in this template', 404);

    await prisma.wtdWorkflowTemplateDependency.delete({ where: { wtdId } });

    await auditOrchestrator.log({
      entityName: 'wtd_workflow_template_dependencies',
      entityId: wtdId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: null,
      comment: 'Dependency removed from workflow template',
    });

    void userId;
  }

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------

  async addNotification(
    wflId: string,
    wtkId: string,
    data: AddNotificationInput,
    userId: string,
    userEmail: string,
  ) {
    await requireEditableTemplate(wflId);

    const task = await prisma.wtkWorkflowTemplateTask.findFirst({
      where: { wtkId, wflId },
      select: { wtkId: true },
    });
    if (task === null) throw new AppError('Task not found in this template', 404);

    const notification = await prisma.wtnWorkflowTemplateNotification.create({
      data: {
        wtkId,
        eventType: data.eventType,
        recipientType: data.recipientType,
        messageTemplate: data.messageTemplate,
        createdBy: userId,
        ...(data.recipientUserId !== undefined && { recipientUserId: data.recipientUserId }),
        ...(data.recipientRoleId !== undefined && { recipientRoleId: data.recipientRoleId }),
        ...(data.recipientDynamicType !== undefined && { recipientDynamicType: data.recipientDynamicType }),
        ...(data.emailTemplate !== undefined && { emailTemplate: data.emailTemplate }),
        ...(data.slackTemplate !== undefined && { slackTemplate: data.slackTemplate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wtn_workflow_template_notifications',
      entityId: notification.wtnId,
      createdBy: userEmail,
      oldValues: null,
      newValues: notification as unknown as Record<string, unknown>,
      comment: 'Notification added to workflow task',
    });

    return notification;
  }

  async updateNotification(
    wflId: string,
    wtkId: string,
    wtnId: string,
    data: UpdateNotificationInput,
    userId: string,
    userEmail: string,
  ) {
    await requireEditableTemplate(wflId);

    const existing = await prisma.wtnWorkflowTemplateNotification.findFirst({
      where: { wtnId, wtkId, task: { wflId } },
    });
    if (existing === null) throw new AppError('Notification not found in this task', 404);

    const updated = await prisma.wtnWorkflowTemplateNotification.update({
      where: { wtnId },
      data: {
        ...(data.eventType !== undefined && { eventType: data.eventType }),
        ...(data.recipientType !== undefined && { recipientType: data.recipientType }),
        ...(data.recipientUserId !== undefined && { recipientUserId: data.recipientUserId }),
        ...(data.recipientRoleId !== undefined && { recipientRoleId: data.recipientRoleId }),
        ...(data.recipientDynamicType !== undefined && { recipientDynamicType: data.recipientDynamicType }),
        ...(data.messageTemplate !== undefined && { messageTemplate: data.messageTemplate }),
        ...(data.emailTemplate !== undefined && { emailTemplate: data.emailTemplate }),
        ...(data.slackTemplate !== undefined && { slackTemplate: data.slackTemplate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await auditOrchestrator.log({
      entityName: 'wtn_workflow_template_notifications',
      entityId: wtnId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Notification updated in workflow task',
    });

    // userId consumed by audit via userEmail
    void userId;

    return updated;
  }

  async removeNotification(
    wflId: string,
    wtkId: string,
    wtnId: string,
    userId: string,
    userEmail: string,
  ) {
    await requireEditableTemplate(wflId);

    const existing = await prisma.wtnWorkflowTemplateNotification.findFirst({
      where: { wtnId, wtkId, task: { wflId } },
    });
    if (existing === null) throw new AppError('Notification not found in this task', 404);

    await prisma.wtnWorkflowTemplateNotification.delete({ where: { wtnId } });

    await auditOrchestrator.log({
      entityName: 'wtn_workflow_template_notifications',
      entityId: wtnId,
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: null,
      comment: 'Notification removed from workflow task',
    });

    void userId;
  }
}

export const workflowTemplateOrchestrator = new WorkflowTemplateOrchestrator();

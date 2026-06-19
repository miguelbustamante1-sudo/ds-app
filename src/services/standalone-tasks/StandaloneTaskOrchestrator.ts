import { prisma } from '../../db/prisma';
import { createTask } from './components/CreateTask';
import { resolveTask } from './components/ResolveTask';
import { addComment, getComments } from './components/AddComment';
import { getTaskById } from './components/GetTask';
import { getTaskInbox } from './components/GetTaskInbox';
import { getAdminTaskList } from './components/GetAdminTaskList';
import type { AdminTaskListFilters } from './components/GetAdminTaskList';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { generateTaskInstances } from '../recurring-task-templates/components/GenerateTaskInstances';
import type {
  CreateStandaloneTaskDTO,
  ResolveStandaloneTaskDTO,
  AddStandaloneTaskCommentDTO,
  StandaloneTaskDTO,
  StandaloneTaskCommentDTO,
} from '@shared/dto';

const TASK_TABLE = 'ds.tsk_standalone_tasks';

function taskToAuditRecord(dto: StandaloneTaskDTO): Record<string, unknown> {
  return {
    taskId: dto.taskId,
    taskTitle: dto.taskTitle,
    taskDescription: dto.taskDescription,
    taskStatus: dto.taskStatus,
    taskPriority: dto.taskPriority,
    taskDueDate: dto.taskDueDate,
    teamMemberId: dto.teamMemberId,
    taskReferenceType: dto.taskReferenceType,
    taskReferenceId: dto.taskReferenceId,
    taskSource: dto.taskSource,
    createdBy: dto.createdBy,
    createdDate: dto.createdDate,
    updatedBy: dto.updatedBy,
    updatedDate: dto.updatedDate,
    resolvedBy: dto.resolvedBy,
    resolvedDate: dto.resolvedDate,
    resolutionComment: dto.resolutionComment,
  };
}

function commentToAuditRecord(dto: StandaloneTaskCommentDTO): Record<string, unknown> {
  return {
    commentId: dto.commentId,
    taskId: dto.taskId,
    commentText: dto.commentText,
    createdBy: dto.createdBy,
    createdDate: dto.createdDate,
  };
}
const COMMENT_TABLE = 'ds.tco_standalone_task_comments';

async function orchestrateCreateTask(
  input: CreateStandaloneTaskDTO,
  createdBy: number,
  createdByEmail: string,
  options: { taskSource?: string; apiKeyId?: number } = {},
): Promise<StandaloneTaskDTO> {
  const task = await createTask(input, createdBy, options);
  await auditOrchestrator.log({
    entityName: TASK_TABLE,
    entityId: String(task.taskId),
    createdBy: createdByEmail,
    oldValues: null,
    newValues: taskToAuditRecord(task),
    comment: 'Standalone task created',
  });
  return task;
}

async function orchestrateResolveTask(
  taskId: number,
  input: ResolveStandaloneTaskDTO,
  resolvedBy: number,
  resolvedByEmail: string,
  resolvedByTeamMemberId: number,
): Promise<{ task: StandaloneTaskDTO; warning?: string }> {
  const { before, after } = await resolveTask(taskId, input, resolvedBy);

  await auditOrchestrator.log({
    entityName: TASK_TABLE,
    entityId: String(taskId),
    createdBy: resolvedByEmail,
    oldValues: taskToAuditRecord(before),
    newValues: taskToAuditRecord(after),
    comment: 'Standalone task resolved',
  });

  // Non-recurring tasks or rejections — nothing more to do.
  if (!after.recurringTemplateId || input.status !== 'APPROVED') {
    return { task: after };
  }

  if (!input.executionDate) {
    return { task: after, warning: 'No execution date provided. The next task was not scheduled.' };
  }

  const meetingDate = new Date(input.executionDate);

  await prisma.standaloneTask.update({
    where: { taskId },
    data: { meetingDate },
  });

  const template = await prisma.recurringTaskTemplate.findUnique({
    where: { templateId: after.recurringTemplateId },
    select: { intervalDays: true },
  });
  if (!template) return { task: after, warning: 'Template not found; next task not scheduled.' };

  const nextDueDate = new Date(meetingDate);
  nextDueDate.setDate(nextDueDate.getDate() + template.intervalDays);

  await generateTaskInstances({
    templateId: after.recurringTemplateId,
    dueDate: nextDueDate,
    createdByDsUserId: resolvedBy,
    createdByEmail: resolvedByEmail,
    createdByTeamMemberId: resolvedByTeamMemberId,
    ...(after.hierarchyContextId !== null && { hierarchyContextId: after.hierarchyContextId }),
  });

  return { task: after };
}

async function orchestrateAddComment(
  taskId: number,
  input: AddStandaloneTaskCommentDTO,
  createdBy: number,
  createdByEmail: string,
): Promise<StandaloneTaskCommentDTO> {
  const comment = await addComment(taskId, input, createdBy);
  await auditOrchestrator.log({
    entityName: COMMENT_TABLE,
    entityId: String(comment.commentId),
    createdBy: createdByEmail,
    oldValues: null,
    newValues: commentToAuditRecord(comment),
    comment: 'Task comment added',
  });
  return comment;
}

export const standaloneTaskOrchestrator = {
  createTask: orchestrateCreateTask,
  resolveTask: orchestrateResolveTask,
  addComment: orchestrateAddComment,
  getTaskById,
  getTaskInbox,
  getComments,
  getAdminTaskList,
};

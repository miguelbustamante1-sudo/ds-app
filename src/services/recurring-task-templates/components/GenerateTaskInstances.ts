import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { getReportsForRecurringTasks } from '../../teamMember/queries/getReportsForRecurringTasks';
import { TASK_INCLUDE, toTaskDTO } from '../../standalone-tasks/mappers';
import type { StandaloneTaskDTO } from '@shared/dto';

export interface GenerateInstancesInput {
  templateId: number;
  dueDate: Date;
  createdByDsUserId: number;
  createdByEmail: string;
  createdByTeamMemberId: number;
  /** When re-generating after resolution, pass the specific direct report to target. */
  hierarchyContextId?: number;
}

export async function generateTaskInstances(
  input: GenerateInstancesInput,
): Promise<StandaloneTaskDTO[]> {
  if (!input.createdByDsUserId) throw new AppError('Unauthenticated', 401);

  const template = await prisma.recurringTaskTemplate.findUnique({
    where: { templateId: input.templateId },
  });
  if (!template) throw new AppError('Template not found', 404);
  if (!template.isActive) return [];

  const created: StandaloneTaskDTO[] = [];

  if (template.useSupervisorHierarchy) {
    const targets = input.hierarchyContextId
      ? [{ teamMemberId: input.hierarchyContextId }]
      : await getReportsForRecurringTasks(input.createdByTeamMemberId);

    for (const report of targets) {
      const task = await prisma.standaloneTask.create({
        data: {
          taskTitle: template.templateTitle,
          taskDescription: template.templateDescription ?? null,
          taskPriority: template.templatePriority,
          taskStatus: 'PENDING',
          taskDueDate: input.dueDate,
          teamMemberId: input.createdByTeamMemberId,
          taskSource: 'INTERNAL',
          recurringTemplateId: template.templateId,
          hierarchyContextId: report.teamMemberId,
          createdBy: input.createdByDsUserId,
        },
        include: TASK_INCLUDE,
      });

      const dto = toTaskDTO(task);
      created.push(dto);

      await auditOrchestrator.log({
        entityName: 'ds.tsk_standalone_tasks',
        entityId: String(task.taskId),
        createdBy: input.createdByEmail,
        oldValues: null,
        newValues: dto as unknown as Record<string, unknown>,
        comment: `Recurring task instance created from template ${template.templateId}`,
      });
    }
  } else {
    if (!template.teamMemberId) throw new AppError('Template has no assignee', 500);

    const task = await prisma.standaloneTask.create({
      data: {
        taskTitle: template.templateTitle,
        taskDescription: template.templateDescription ?? null,
        taskPriority: template.templatePriority,
        taskStatus: 'PENDING',
        taskDueDate: input.dueDate,
        teamMemberId: template.teamMemberId,
        taskSource: 'INTERNAL',
        recurringTemplateId: template.templateId,
        createdBy: input.createdByDsUserId,
      },
      include: TASK_INCLUDE,
    });

    const dto = toTaskDTO(task);
    created.push(dto);

    await auditOrchestrator.log({
      entityName: 'ds.tsk_standalone_tasks',
      entityId: String(task.taskId),
      createdBy: input.createdByEmail,
      oldValues: null,
      newValues: dto as unknown as Record<string, unknown>,
      comment: `Recurring task instance created from template ${template.templateId}`,
    });
  }

  return created;
}

import { createTemplate } from './components/CreateTemplate';
import { updateTemplate } from './components/UpdateTemplate';
import { getTemplateById } from './components/GetTemplate';
import { getTemplateList } from './components/GetTemplateList';
import { generateTaskInstances } from './components/GenerateTaskInstances';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type {
  CreateRecurringTaskTemplateDTO,
  UpdateRecurringTaskTemplateDTO,
  RecurringTaskTemplateDTO,
} from '@shared/dto';

const TEMPLATE_TABLE = 'ds.rtt_recurring_task_templates';

async function orchestrateCreateTemplate(
  input: CreateRecurringTaskTemplateDTO,
  createdByDsUserId: number,
  createdByEmail: string,
  createdByTeamMemberId: number,
): Promise<RecurringTaskTemplateDTO> {
  const template = await createTemplate(input, createdByDsUserId);

  await auditOrchestrator.log({
    entityName: TEMPLATE_TABLE,
    entityId: String(template.templateId),
    createdBy: createdByEmail,
    oldValues: null,
    newValues: template as unknown as Record<string, unknown>,
    comment: 'Recurring task template created',
  });

  if (template.autoGenerateOnCreate) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + template.intervalDays);

    await generateTaskInstances({
      templateId: template.templateId,
      dueDate,
      createdByDsUserId,
      createdByEmail,
      createdByTeamMemberId,
    });
  }

  return template;
}

async function orchestrateUpdateTemplate(
  templateId: number,
  input: UpdateRecurringTaskTemplateDTO,
  updatedByDsUserId: number,
  updatedByEmail: string,
): Promise<RecurringTaskTemplateDTO> {
  const before = await getTemplateById(templateId);
  const after = await updateTemplate(templateId, input, updatedByDsUserId);

  await auditOrchestrator.log({
    entityName: TEMPLATE_TABLE,
    entityId: String(templateId),
    createdBy: updatedByEmail,
    oldValues: before as unknown as Record<string, unknown>,
    newValues: after as unknown as Record<string, unknown>,
    comment: 'Recurring task template updated',
  });

  return after;
}

export const recurringTaskTemplateOrchestrator = {
  createTemplate: orchestrateCreateTemplate,
  updateTemplate: orchestrateUpdateTemplate,
  getTemplateById,
  getTemplateList,
};

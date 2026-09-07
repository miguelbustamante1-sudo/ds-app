import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type {
  RecurringTaskTemplateDTO,
  CreateRecurringTaskTemplateDTO,
  UpdateRecurringTaskTemplateDTO,
} from '@shared/dto';

export async function getRecurringTaskTemplates(
  includeInactive = false,
): Promise<RecurringTaskTemplateDTO[]> {
  return apiGet<RecurringTaskTemplateDTO[]>(
    `/api/recurring-task-templates?includeInactive=${includeInactive}`,
  );
}

export async function getRecurringTaskTemplate(
  rttId: number,
): Promise<RecurringTaskTemplateDTO> {
  return apiGet<RecurringTaskTemplateDTO>(`/api/recurring-task-templates/${rttId}`);
}

export async function createRecurringTaskTemplate(
  body: CreateRecurringTaskTemplateDTO,
): Promise<RecurringTaskTemplateDTO> {
  return apiPost<RecurringTaskTemplateDTO>('/api/recurring-task-templates', body);
}

export async function updateRecurringTaskTemplate(
  rttId: number,
  body: UpdateRecurringTaskTemplateDTO,
): Promise<RecurringTaskTemplateDTO> {
  return apiPatch<RecurringTaskTemplateDTO>(`/api/recurring-task-templates/${rttId}`, body);
}

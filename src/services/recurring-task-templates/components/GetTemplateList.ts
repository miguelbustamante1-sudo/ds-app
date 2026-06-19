import { prisma } from '../../../db/prisma';
import type { RecurringTaskTemplateDTO } from '@shared/dto';
import { TEMPLATE_INCLUDE, toTemplateDTO } from '../mappers';

export interface TemplateListFilters {
  includeInactive?: boolean;
}

export async function getTemplateList(
  filters: TemplateListFilters = {},
): Promise<RecurringTaskTemplateDTO[]> {
  const query = {
    include: TEMPLATE_INCLUDE,
    orderBy: { createdDate: 'desc' as const },
    ...(filters.includeInactive ? {} : { where: { isActive: true } }),
  };
  const templates = await prisma.recurringTaskTemplate.findMany(query);
  return templates.map((t) => toTemplateDTO(t as Parameters<typeof toTemplateDTO>[0]));
}

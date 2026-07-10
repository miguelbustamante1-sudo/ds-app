import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { RecurringTaskTemplateDTO } from '@shared/dto';
import { TEMPLATE_INCLUDE, toTemplateDTO } from '../mappers';

export async function getTemplateById(templateId: number): Promise<RecurringTaskTemplateDTO> {
  const template = await prisma.recurringTaskTemplate.findUnique({
    where: { templateId },
    include: TEMPLATE_INCLUDE,
  });
  if (!template) throw new AppError('Template not found', 404);
  return toTemplateDTO(template);
}

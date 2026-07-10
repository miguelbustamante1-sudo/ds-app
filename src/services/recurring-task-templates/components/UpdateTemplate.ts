import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { UpdateRecurringTaskTemplateDTO, RecurringTaskTemplateDTO } from '@shared/dto';
import { TEMPLATE_INCLUDE, toTemplateDTO } from '../mappers';

export async function updateTemplate(
  templateId: number,
  input: UpdateRecurringTaskTemplateDTO,
  updatedBy: number,
): Promise<RecurringTaskTemplateDTO> {
  const existing = await prisma.recurringTaskTemplate.findUnique({
    where: { templateId },
  });
  if (!existing) throw new AppError('Template not found', 404);

  const now = new Date();
  const updated = await prisma.recurringTaskTemplate.update({
    where: { templateId },
    data: {
      ...(input.templateTitle !== undefined && { templateTitle: input.templateTitle.trim() }),
      ...(input.templateDescription !== undefined && { templateDescription: input.templateDescription }),
      ...(input.templatePriority !== undefined && { templatePriority: input.templatePriority }),
      ...(input.intervalDays !== undefined && { intervalDays: input.intervalDays }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedBy,
      updatedDate: now,
    },
    include: TEMPLATE_INCLUDE,
  });

  return toTemplateDTO(updated);
}

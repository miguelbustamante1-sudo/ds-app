import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { CreateRecurringTaskTemplateDTO, RecurringTaskTemplateDTO } from '@shared/dto';
import { TEMPLATE_INCLUDE, toTemplateDTO } from '../mappers';

export async function createTemplate(
  input: CreateRecurringTaskTemplateDTO,
  createdBy: number,
): Promise<RecurringTaskTemplateDTO> {
  if (!input.templateTitle?.trim()) throw new AppError('Template title is required', 400);
  if (!input.useSupervisorHierarchy && !input.teamMemberId) {
    throw new AppError('Assignee is required when not using supervisor hierarchy', 400);
  }
  if (input.useSupervisorHierarchy && input.teamMemberId) {
    throw new AppError('Assignee must be null when using supervisor hierarchy', 400);
  }

  if (input.teamMemberId) {
    const member = await prisma.teamMember.findUnique({
      where: { teamMemberId: input.teamMemberId },
      select: { teamMemberId: true },
    });
    if (!member) throw new AppError('Assignee not found', 404);
  }

  const template = await prisma.recurringTaskTemplate.create({
    data: {
      templateTitle: input.templateTitle.trim(),
      templateDescription: input.templateDescription?.trim() ?? null,
      templatePriority: input.templatePriority ?? 'MEDIUM',
      intervalDays: input.intervalDays ?? 30,
      useSupervisorHierarchy: input.useSupervisorHierarchy,
      teamMemberId: input.teamMemberId ?? null,
      autoGenerateOnCreate: input.autoGenerateOnCreate ?? true,
      isActive: true,
      createdBy,
    },
    include: TEMPLATE_INCLUDE,
  });

  return toTemplateDTO(template);
}

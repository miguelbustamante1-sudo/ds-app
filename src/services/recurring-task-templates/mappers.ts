import type { RecurringTaskTemplate, TeamMember } from '@prisma/client';
import type { RecurringTaskTemplateDTO } from '@shared/dto';

type TemplateRow = RecurringTaskTemplate & {
  teamMember: Pick<TeamMember, 'teamMemberNames' | 'teamMemberSurnames'> | null;
};

export const TEMPLATE_INCLUDE = {
  teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
} as const;

export function toTemplateDTO(row: TemplateRow): RecurringTaskTemplateDTO {
  return {
    templateId: row.templateId,
    templateTitle: row.templateTitle,
    templateDescription: row.templateDescription,
    templatePriority: row.templatePriority as RecurringTaskTemplateDTO['templatePriority'],
    intervalDays: row.intervalDays,
    useSupervisorHierarchy: row.useSupervisorHierarchy,
    teamMemberId: row.teamMemberId,
    teamMemberNames: row.teamMember?.teamMemberNames ?? null,
    teamMemberSurnames: row.teamMember?.teamMemberSurnames ?? null,
    autoGenerateOnCreate: row.autoGenerateOnCreate,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDate: row.createdDate.toISOString(),
    updatedBy: row.updatedBy,
    updatedDate: row.updatedDate ? row.updatedDate.toISOString() : null,
  };
}

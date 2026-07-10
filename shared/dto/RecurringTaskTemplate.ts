export type TemplatePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RecurringTaskTemplateDTO {
  templateId: number;
  templateTitle: string;
  templateDescription: string | null;
  templatePriority: TemplatePriority;
  intervalDays: number;
  useSupervisorHierarchy: boolean;
  teamMemberId: number | null;
  teamMemberNames: string | null;
  teamMemberSurnames: string | null;
  autoGenerateOnCreate: boolean;
  isActive: boolean;
  createdBy: number;
  createdDate: string;
  updatedBy: number | null;
  updatedDate: string | null;
}

export interface CreateRecurringTaskTemplateDTO {
  templateTitle: string;
  templateDescription?: string | null;
  templatePriority?: TemplatePriority;
  intervalDays?: number;
  useSupervisorHierarchy: boolean;
  teamMemberId?: number | null;
  autoGenerateOnCreate?: boolean;
}

export interface UpdateRecurringTaskTemplateDTO {
  templateTitle?: string;
  templateDescription?: string | null;
  templatePriority?: TemplatePriority;
  intervalDays?: number;
  isActive?: boolean;
}

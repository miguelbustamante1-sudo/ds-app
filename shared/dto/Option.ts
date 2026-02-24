/**
 * DTOs for Option entity (RBAC resource catalog)
 * Maps to: sec.opt_options
 */

export interface OptionDTO {
  optionId: number;
  optionDescription: string | null;
  optionCreatedBy: string | null;
  optionCreatedAt: Date | null;
}

export interface CreateOptionDTO {
  optionDescription: string;
  optionCreatedBy?: string | null;
}

export interface UpdateOptionDTO {
  optionDescription?: string;
}

export interface IncomeTypeDTO {
  incomeTypeId: number;
  incomeTypeName: string;
  incomeTypeIsActive: boolean;
  incomeTypeCreatedBy: number;
  incomeTypeCreatedDate: Date;
  incomeTypeLastUpdatedBy: number | null;
  incomeTypeLastUpdatedDate: Date | null;
}

/**
 * Excludes: incomeTypeId (auto), audit fields (server-populated)
 */
export interface CreateIncomeTypeDTO {
  incomeTypeName: string;
  incomeTypeIsActive?: boolean;
}

export interface UpdateIncomeTypeDTO {
  incomeTypeName?: string;
  incomeTypeIsActive?: boolean;
}

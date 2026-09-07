/**
 * DTOs for Other Incomes bulk CSV import.
 * Team member is resolved by Workday ID, income type by name (must be active),
 * and payrol period by description (must be Open) — each row is independent,
 * so a batch can span multiple payrol periods.
 */

export interface OtherIncomeImportEntryDTO {
  workdayId: string;
  incomeTypeName: string;
  amount: number;
  cuantity: string;
  measurment: string;
  payrolDescription: string;
}

export interface SubmitOtherIncomeImportEntriesDTO {
  entries: OtherIncomeImportEntryDTO[];
}

export interface OtherIncomeImportEntryResultDTO {
  index: number;
  workdayId: string;
  success: boolean;
  oinId?: number;
  error?: string;
}

export interface SubmitOtherIncomeImportResponseDTO {
  results: OtherIncomeImportEntryResultDTO[];
  insertedCount: number;
  failedCount: number;
}

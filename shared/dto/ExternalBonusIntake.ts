export interface BonusExternalEntryDTO {
  workdayId: string;
  bonusType: string;
  amount: number;
  month: number;
  year: number;
}

export interface SubmitBonusExternalEntriesDTO {
  entries: BonusExternalEntryDTO[];
}

export interface SubmitBonusExternalEntriesResponseDTO {
  inserted: number;
}

export interface BonusImpactDTO {
  bniId: number;
  bniTeamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  bniDescription: string;
  bniComment: string | null;
  bniAmount: string;
  bniCurrency: string;
  bniMonth: string;
  bniStatus: 'Registered' | 'Notified' | 'Processed' | 'Dropped';
  bniPrlId: number | null;
  bniNotifiedAt: string | null;
  bniProcessedAt: string | null;
  bniCreatedAt: string;
}

export interface CreateBonusImpactDTO {
  bniTeamMemberId: number;
  bniDescription: string;
  bniComment?: string;
  bniAmount?: number;
  bniCurrency?: string;
  bniMonth: string;
}

export interface ProcessBonusImpactDTO {
  bniPrlId: number;
}

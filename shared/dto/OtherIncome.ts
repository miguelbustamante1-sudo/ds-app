export interface OtherIncomeTeamMemberInfo {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

export interface OtherIncomeIncomeTypeInfo {
  incomeTypeId: number;
  incomeTypeName: string;
}

export interface OtherIncomePayrolInfo {
  prlId: number;
  prlDescription: string;
  prlMonth: number;
  prlYear: number;
  prlStatus: string;
}

export type OtherIncomeStatus = 'Pending' | 'Approved' | 'Rejected';

export interface OtherIncomeDTO {
  oinId: number;
  teamMemberWdid: string;
  incomeTypeId: number;
  oinAmount: string; // Prisma Decimal serializes to string over JSON
  oinCuantity: string;
  oinMeasurment: string;
  authorizerWdid: string;
  payrolId: number;
  oinStatus: OtherIncomeStatus;
  oinRejectionReason: string | null;
  oinDecidedBy: number | null;
  oinDecidedDate: string | null;
  oinCreatedBy: number;
  oinCreatedDate: string;
  oinLastUpdatedBy: number | null;
  oinLastUpdatedDate: string | null;
  teamMember: OtherIncomeTeamMemberInfo;
  incomeType: OtherIncomeIncomeTypeInfo;
  authorizer: OtherIncomeTeamMemberInfo;
  payrol: OtherIncomePayrolInfo;
}

/**
 * Excludes: oinId (auto), authorizerWdid (server-resolved via ResolveAuthorizer),
 * status/decision fields (workflow-managed), audit fields (server-populated)
 */
export interface CreateOtherIncomeDTO {
  teamMemberWdid: string;
  incomeTypeId: number;
  oinAmount: number;
  oinCuantity: string;
  oinMeasurment: string;
  payrolId: number;
}

/**
 * authorizerWdid is optional and honored only when the caller is admin —
 * the orchestrator enforces this, not the DTO shape.
 */
export interface UpdateOtherIncomeDTO {
  teamMemberWdid?: string;
  incomeTypeId?: number;
  oinAmount?: number;
  oinCuantity?: string;
  oinMeasurment?: string;
  payrolId?: number;
  authorizerWdid?: string;
}

export interface BulkDeleteOtherIncomeDTO {
  oinIds: number[];
}

export interface RenewPhoneContractsDTO {
  phoneLineIds: number[];
  newStartDate: string; // "YYYY-MM-DD"
}

export interface UpdatePhoneContractDTO {
  phoneNumber?: string;
  contractStartDate?: string;
  contractMonths?: number | null;
  actualCostRate?: number | null;
  countryId?: number | null;
  comments?: string | null;
  teamMemberId?: number;
  billable?: boolean;
  billRate?: number;
  remarks?: string | null;
}

export interface CreatePhoneContractDTO {
  phoneNumber: string;
  contractStartDate: string;
  contractMonths?: number | null;
  actualCostRate?: number | null;
  countryId?: number | null;
  comments?: string | null;
  teamMemberId: number;
  billable: boolean;
  billRate: number;
  remarks?: string | null;
}

export interface PhoneContractActiveAssignmentDTO {
  phoneAssignmentId: number;
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  billRate: number;
  assignDateStart: Date;
  billable: boolean;
  remarks: string | null;
}

export interface PhoneContractDTO {
  phoneLineId: number;
  phoneNumber: string;
  contractStartDate: Date | null;
  contractEndDate: Date | null;
  contractMonths: number | null;
  renewalParentId: number | null;
  actualCostRate: number | null;
  countryId: number | null;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  isActive: boolean;
  activeAssignment: PhoneContractActiveAssignmentDTO | null;
}

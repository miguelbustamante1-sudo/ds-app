export interface ProjectAssignmentDTO {
  projectAssignmentId: number;
  teamMemberId: number | null;
  projectId: number | null;
  projectAssignmentStartDate: Date;
  projectAssignmentEndDate: Date | null;
  projectAssignmentBillRate: number | null;
  projectAssignmentBillRateCurrency: string | null;
  projectAssignmentCreatedBy: number | null;
  projectAssignmentCreatedDate: Date | null;
  projectAssignmentLastUpdatedBy: number | null;
  projectAssignmentLastUpdatedDate: Date | null;
  projectAssignmentAllocation: number | null;
  projectAssignmentDeleted: boolean;
  clientContactId: number | null;
  onCallRate: number | null;
  shiftId?: number | null;
}

export interface CreateProjectAssignmentDTO {
  teamMemberId: number | null;
  projectId: number | null;
  projectAssignmentStartDate: Date | string;
  projectAssignmentEndDate?: Date | string | null;
  projectAssignmentBillRate?: number | null;
  projectAssignmentBillRateCurrency?: string | null;
  projectAssignmentAllocation?: number | null;
  clientContactId?: number | null;
  onCallRate?: number | null;
  shiftId?: number | null;
}

export interface UpdateProjectAssignmentDTO {
  projectAssignmentStartDate?: Date | string;
  projectAssignmentEndDate?: Date | string | null;
  projectAssignmentBillRate?: number | null;
  projectAssignmentBillRateCurrency?: string | null;
  projectAssignmentAllocation?: number | null;
  clientContactId?: number | null;
  onCallRate?: number | null;
  shiftId?: number | null;
}

export interface ProjectAssignmentWithDetailsDTO extends ProjectAssignmentDTO {
  teamMemberName: string | null;
  teamMemberSeniority: string | null;
  projectName: string | null;
  clientContactName: string | null;
  clientName: string | null;
  clientContacts: { id: number; name: string }[];
}

export interface BenchAvailableMemberDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberSeniority: string | null;
  totalAllocation: number;
}

export interface BulkRemoveAssignmentsDTO {
  assignmentIds: number[];
  lastBillableDate: string;
}

export interface BulkChangeRateDTO {
  assignmentIds: number[];
  newBillRate: number;
  newBillRateCurrency: string;
  newOnCallRate: number | null;
  startDate: string;
}

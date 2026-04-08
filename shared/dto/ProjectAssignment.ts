/**
 * DTOs for ProjectAssignment entity
 */

/**
 * ProjectAssignmentDTO - Full project assignment data returned to client
 */
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
  intercompanyBillRate: number | null;
}

/**
 * CreateProjectAssignmentDTO - Data required to create a new project assignment
 */
export interface CreateProjectAssignmentDTO {
  teamMemberId: number | null;
  projectId: number | null;
  projectAssignmentStartDate: Date | string;
  projectAssignmentEndDate?: Date | string | null;
  projectAssignmentBillRate?: number | null;
  projectAssignmentBillRateCurrency?: string | null;
  projectAssignmentAllocation?: number | null;
  clientContactId?: number | null;
  intercompanyBillRate?: number | null;
}

/**
 * UpdateProjectAssignmentDTO - Data allowed to be updated
 */
export interface UpdateProjectAssignmentDTO {
  projectAssignmentStartDate?: Date | string;
  projectAssignmentEndDate?: Date | string | null;
  projectAssignmentBillRate?: number | null;
  projectAssignmentBillRateCurrency?: string | null;
  projectAssignmentAllocation?: number | null;
  clientContactId?: number | null;
  intercompanyBillRate?: number | null;
}

/**
 * ProjectAssignmentWithDetailsDTO - Enriched DTO with team member and project names
 */
export interface ProjectAssignmentWithDetailsDTO extends ProjectAssignmentDTO {
  teamMemberName: string | null;
  teamMemberSeniority: string | null;
  projectName: string | null;
  clientContactName: string | null;
  clientName: string | null;
  clientContacts: { id: number; name: string }[];
}

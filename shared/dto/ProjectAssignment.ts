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
  roleId: number | null;
  projectAssignmentBillRate: number | null;
  projectAssignmentBillRateCurrency: string | null;
  projectAssignmentCreatedBy: number | null;
  projectAssignmentCreatedDate: Date | null;
  projectAssignmentLastUpdatedBy: number | null;
  projectAssignmentLastUpdatedDate: Date | null;
}

/**
 * CreateProjectAssignmentDTO - Data required to create a new project assignment
 */
export interface CreateProjectAssignmentDTO {
  teamMemberId: number | null;
  projectId: number | null;
  projectAssignmentStartDate: Date | string;
  projectAssignmentEndDate?: Date | string | null;
  roleId: number | null;
  projectAssignmentBillRate?: number | null;
  projectAssignmentBillRateCurrency?: string | null;
}

/**
 * UpdateProjectAssignmentDTO - Data allowed to be updated
 */
export interface UpdateProjectAssignmentDTO {
  projectAssignmentStartDate?: Date | string;
  projectAssignmentEndDate?: Date | string | null;
  roleId?: number | null;
  projectAssignmentBillRate?: number | null;
  projectAssignmentBillRateCurrency?: string | null;
}

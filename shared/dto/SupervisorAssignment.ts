/**
 * DTOs for Supervisor Assignment
 * Maps supervisor-to-team member relationships from tbl_tms_x_supervisor
 */

/**
 * Embedded team member info for display in grid
 */
export interface SupervisorAssignmentTeamMemberInfo {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

/**
 * SupervisorAssignmentDTO - Full supervisor assignment data returned to client
 * Includes expanded team member info for both supervisor and team member
 */
export interface SupervisorAssignmentDTO {
  supervisorAssignmentId: number;
  teamMemberId: number | null;
  supervisorId: number | null;
  supervisorAssignmentStartDate: Date;
  supervisorAssignmentEndDate: Date | null;
  supervisorAssignmentCreatedBy: number | null;
  supervisorAssignmentCreatedDate: Date | null;
  supervisorAssignmentLastUpdatedBy: number | null;
  supervisorAssignmentLastUpdatedDate: Date | null;
  // Expanded relations for display
  teamMember: SupervisorAssignmentTeamMemberInfo | null;
  supervisor: SupervisorAssignmentTeamMemberInfo | null;
}

/**
 * CreateSupervisorAssignmentDTO - Data required to create a new supervisor assignment
 * Excludes:
 * - supervisorAssignmentId (auto-generated)
 * - audit fields (auto-populated server-side)
 * - expanded relations (read-only)
 */
export interface CreateSupervisorAssignmentDTO {
  teamMemberId: number;
  supervisorId: number;
  supervisorAssignmentStartDate: Date | string;
  supervisorAssignmentEndDate?: Date | string | null;
}

/**
 * UpdateSupervisorAssignmentDTO - Data allowed to be updated
 * Excludes:
 * - supervisorAssignmentId (immutable)
 * - audit fields (auto-populated server-side)
 * - expanded relations (read-only)
 */
export interface UpdateSupervisorAssignmentDTO {
  teamMemberId?: number;
  supervisorId?: number;
  supervisorAssignmentStartDate?: Date | string;
  supervisorAssignmentEndDate?: Date | string | null;
}

export interface TransferSupervisorAssignmentsDTO {
  fromSupervisorId: number;
  toSupervisorId: number;
}

export interface TransferSupervisorAssignmentsResultDTO {
  transferredCount: number;
  skippedCount: number;
}

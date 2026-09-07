/**
 * DTOs for Team Member Reimbursement
 * Maps to ds.tmr_team_member_reimbursements
 */

export interface TeamMemberReimbursementTeamMemberInfo {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

export interface TeamMemberReimbursementPayrolInfo {
  prlId: number;
  prlDescription: string;
  prlMonth: number;
  prlYear: number;
}

export interface TeamMemberReimbursementDTO {
  reimbursementId: number;
  teamMemberId: number;
  reimbursementAmount: string; // Prisma Decimal serializes to string over JSON
  reimbursementDate: string;
  payrolId: number | null;
  reimbursementFrequency: number | null;
  reimbursementCreatedBy: number;
  reimbursementCreatedAt: string;
  reimbursementUpdatedBy: number;
  reimbursementUpdatedAt: string;
  teamMember: TeamMemberReimbursementTeamMemberInfo | null;
  payrol: TeamMemberReimbursementPayrolInfo | null;
}

/**
 * CreateTeamMemberReimbursementDTO
 * Excludes: reimbursementId (auto), audit fields (server-populated), expanded relations (read-only)
 */
export interface CreateTeamMemberReimbursementDTO {
  teamMemberId: number;
  reimbursementAmount: number;
  reimbursementDate: string;
  payrolId?: number | null;
  reimbursementFrequency?: number | null;
}

/**
 * UpdateTeamMemberReimbursementDTO
 * All fields optional; excludes id and audit fields
 */
export interface UpdateTeamMemberReimbursementDTO {
  teamMemberId?: number;
  reimbursementAmount?: number;
  reimbursementDate?: string;
  payrolId?: number | null;
  reimbursementFrequency?: number | null;
}

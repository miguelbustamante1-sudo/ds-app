/**
 * DTOs for Team Member On Call
 * Maps to ds.tmo_team_member_oncall
 */

export interface TeamMemberOncallTeamMemberInfo {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

export interface TeamMemberOncallPayrolInfo {
  prlId: number;
  prlDescription: string;
  prlMonth: number;
  prlYear: number;
}

export interface TeamMemberOncallDTO {
  oncallId: number;
  teamMemberId: number;
  oncallAmount: string; // Prisma Decimal serializes to string over JSON
  oncallDate: string;
  payrolId: number | null;
  oncallFrequency: number | null;
  oncallCreatedBy: number;
  oncallCreatedAt: string;
  oncallUpdatedBy: number;
  oncallUpdatedAt: string;
  teamMember: TeamMemberOncallTeamMemberInfo | null;
  payrol: TeamMemberOncallPayrolInfo | null;
}

/**
 * CreateTeamMemberOncallDTO
 * Excludes: oncallId (auto), audit fields (server-populated), expanded relations (read-only)
 */
export interface CreateTeamMemberOncallDTO {
  teamMemberId: number;
  oncallAmount: number;
  oncallDate: string;
  payrolId?: number | null;
  oncallFrequency?: number | null;
}

/**
 * UpdateTeamMemberOncallDTO
 * All fields optional; excludes id and audit fields
 */
export interface UpdateTeamMemberOncallDTO {
  teamMemberId?: number;
  oncallAmount?: number;
  oncallDate?: string;
  payrolId?: number | null;
  oncallFrequency?: number | null;
}

/**
 * BulkDeleteTeamMemberOncallDTO
 * Request body for POST /api/team-member-oncall/bulk-delete
 */
export interface BulkDeleteTeamMemberOncallDTO {
  oncallIds: number[];
}

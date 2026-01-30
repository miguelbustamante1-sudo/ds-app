/**
 * DTOs for Team Member
 * Updated to use normalized Prisma field names
 */

/**
 * TeamMemberDTO - Full team member data returned to client
 */
export interface TeamMemberDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
  teamMemberStartDate: Date;
  teamMemberEndDate: Date | null;
  countryId: number | null;
  workdayId: string | null;
  teamMemberSeniority: string;
  teamMemberPrimaryRole: number | null;
  teamMemberCreatedBy: number | null;
  teamMemberCreatedDate: Date | null;
  teamMemberLastUpdatedBy: number | null;
  teamMemberLastUpdatedDate: Date | null;
  // Optional included relation fields (for list views)
  countryName?: string | null;
  roleName?: string | null;
}

/**
 * CreateTeamMemberDTO - Data required to create a new team member
 * Excludes:
 * - teamMemberId (auto-generated)
 * - audit fields (auto-populated server-side)
 * - workdayId (read-only, synced from external system)
 */
export interface CreateTeamMemberDTO {
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
  teamMemberStartDate: Date | string;
  teamMemberSeniority: string;
  countryId: number | null;
  teamMemberPrimaryRole: number | null;
}

/**
 * UpdateTeamMemberDTO - Data allowed to be updated
 * Excludes:
 * - teamMemberId (immutable)
 * - audit fields (auto-populated server-side)
 * - workdayId (read-only, synced from external system)
 */
export interface UpdateTeamMemberDTO {
  teamMemberNames?: string;
  teamMemberSurnames?: string;
  teamMemberKnownAs?: string | null;
  teamMemberStartDate?: Date | string;
  teamMemberSeniority?: string;
  countryId?: number | null;
  teamMemberPrimaryRole?: number | null;
}

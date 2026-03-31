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
  tierBandId: number | null;
  teamMemberFullLegalName: string | null;
  teamMemberCreatedBy: number | null;
  teamMemberCreatedDate: Date | null;
  teamMemberLastUpdatedBy: number | null;
  teamMemberLastUpdatedDate: Date | null;
  // Optional included relation fields (for list views)
  countryName?: string | null;
  roleName?: string | null;
  tierBandDescription?: string | null;
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
  countryId: number | null;
  teamMemberPrimaryRole: number | null;
  tierBandId: number;
  workdayId: string | null;
  teamMemberFullLegalName: string | null;
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
  teamMemberEndDate?: Date | string | null;
  countryId?: number | null;
  teamMemberPrimaryRole?: number | null;
  tierBandId?: number;
  workdayId?: string | null;
  teamMemberFullLegalName?: string | null;
}

/**
 * AvailableResourceDTO - Team member with their total active allocation.
 * Used by the available-resources query to surface team members with capacity.
 */
export interface AvailableResourceDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
  teamMemberSeniority: string;
  countryId: number | null;
  countryName: string | null;
  roleName: string | null;
  totalAllocation: number;
}

/**
 * AvailableResourceUnderSupervisorDTO - Extends AvailableResourceDTO with
 * computed available allocation and country currency for the Add TM dialog.
 */
export interface AvailableResourceUnderSupervisorDTO extends AvailableResourceDTO {
  availableAllocation: number;           // 100 - totalAllocation
  countryCurrencySymbol: string | null;  // from Country.countryCurrencySymbol
}

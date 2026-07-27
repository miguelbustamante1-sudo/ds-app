export interface TeamMemberDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
  teamMemberStartDate: Date;
  teamMemberEndDate: Date | null;
  countryId: number | null;
  countryIso?: string | null;
  workdayId: string | null;
  teamMemberSeniority: string;
  teamMemberPrimaryRole: number | null;
  tierBandId: number | null;
  teamMemberFullLegalName: string | null;
  teamMemberXid: string | null;
  teamMemberCreatedBy: number | null;
  teamMemberCreatedDate: Date | null;
  teamMemberLastUpdatedBy: number | null;
  teamMemberLastUpdatedDate: Date | null;
  shiftId?: number | null;
  // Optional included relation fields (for list views)
  countryName?: string | null;
  roleName?: string | null;
  tierBandDescription?: string | null;
  shiftDescription?: string | null;
  /** The member's currently active project assignments (FR-009). Empty when unassigned. */
  assignedProjects?: { projectId: number; projectName: string | null }[];
}

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
  teamMemberXid?: string | null;
  shiftId?: number | null;
}

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
  teamMemberXid?: string | null;
  shiftId?: number | null;
}

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

export interface AvailableResourceUnderSupervisorDTO extends AvailableResourceDTO {
  availableAllocation: number;           // 100 - totalAllocation
  countryCurrencySymbol: string | null;  // from Country.countryCurrencySymbol
}

/**
 * HiringTeamLeadOptionDTO - Minimal shape for the hiring wizard's team-lead ComboBox
 */
export interface HiringTeamLeadOptionDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

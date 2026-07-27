/**
 * DTOs for Team-Lead self-service team management (FR-011) and the
 * OM approval workflow for sensitive team-member changes.
 */

export type TeamMemberChangeRequestType = 'edit' | 'attrition';
export type TeamMemberChangeRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface TeamMemberChangeRequestDTO {
  changeRequestId: number;
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  type: TeamMemberChangeRequestType;
  status: TeamMemberChangeRequestStatus;
  changes: Record<string, { old: unknown; new: unknown }>;
  requestedBy: number;
  requestedByName: string | null;
  requestedAt: Date | string;
  reviewedBy: number | null;
  reviewedByName: string | null;
  reviewedAt: Date | string | null;
  reviewComment: string | null;
}

/** Approval-required fields a Team Lead may request a change for (FR-011). */
export interface CreateTeamMemberChangeRequestDTO {
  tierBandId?: number | null;
  teamMemberPrimaryRole?: number | null;
  teamMemberFullLegalName?: string | null;
}

/** Attrition — dedicated action prompting for the last day (Q-005). */
export interface CreateAttritionRequestDTO {
  teamMemberEndDate: string;
}

export interface ReviewTeamMemberChangeRequestDTO {
  comment?: string | null;
}

/** A team member as shown on the Team Management (Team Lead) screen. */
export interface MyTeamMemberForManagementDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
  teamMemberStartDate: Date | string;
  teamMemberEndDate: Date | string | null;
  countryName: string | null;
  workdayId: string | null;
  tierBandId: number | null;
  tierBandDescription: string | null;
  teamMemberPrimaryRole: number | null;
  roleName: string | null;
  teamMemberFullLegalName: string | null;
  shiftId: number | null;
  shiftDescription: string | null;
  /** The member's current active project assignment, if any — functionalArea/clientContact are edited here (free edit). */
  activeAssignment: {
    projectAssignmentId: number;
    projectName: string | null;
    clientId: number | null;
    functionalAreaId: number | null;
    functionalAreaName: string | null;
    clientContactId: number | null;
    clientContactName: string | null;
  } | null;
  /** True when this member has an unresolved change request awaiting OM review. */
  hasPendingChangeRequest: boolean;
}

/** Free-edit payload (no approval) — TeamMember.knownAs/shift + active ProjectAssignment.functionalArea/clientContact. */
export interface UpdateMyTeamMemberDTO {
  teamMemberKnownAs?: string | null;
  shiftId?: number | null;
  functionalAreaId?: number | null;
  clientContactId?: number | null;
}

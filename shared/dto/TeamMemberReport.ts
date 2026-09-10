/**
 * DTOs for the canonical Team Member Reports service.
 * Used by all pages/features that need "team members under a supervisor".
 */

import type { ReportType } from './SupervisedTeamMember';

/**
 * Represents a single active project assignment carried on a team member.
 * Used inside TeamMemberReportDTO.currentProjects.
 */
export interface TeamMemberReportProjectDTO {
  projectId: number;
  projectName: string;
  projectExternalId: string | null;
  projectAssignmentAllocation: number;
  projectAssignmentStartDate: Date | null;
  projectAssignmentEndDate: Date | null;
  clientName: string | null;
  clientContacts: string[];
}

/**
 * Canonical shape returned by getReports().
 * Superset of SupervisedTeamMemberDTO — adds currentProjects and countryCurrencySymbol.
 */
export interface TeamMemberReportDTO {
  teamMemberId: number;
  workdayId: string | null;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
  teamMemberFullName: string;               // knownAs + surnames, or names + surnames
  teamMemberSeniority: string;
  teamMemberEndDate: Date | null;
  teamMemberCompanyEndDate?: Date | null;
  teamMemberStartDate: Date | null;
  primaryRoleName: string | null;
  countryId: number | null;
  countryName: string | null;
  countryIso: string | null;
  countryCurrencySymbol: string | null;     // needed for bill-rate currency pre-fill
  reportType: ReportType;
  reportLevel: number;
  supervisorAssignmentStartDate: Date;
  supervisorAssignmentEndDate: Date | null;
  currentProjects: TeamMemberReportProjectDTO[];
}

/**
 * Returned by getAvailableForProject() — extends the canonical shape
 * with computed allocation fields needed by the Add Member dialog.
 */
export interface AvailableForProjectDTO extends TeamMemberReportDTO {
  totalAllocation: number;       // sum of currentProjects[].projectAssignmentAllocation
  availableAllocation: number;   // 100 - totalAllocation
}

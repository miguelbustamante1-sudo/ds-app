/**
 * DTOs for Supervised Team Members
 * Used by supervisors to view their direct and indirect reports
 */

/**
 * Report type indicating the relationship to the supervisor
 */
export type ReportType = 'Direct' | 'Indirect';

/**
 * SupervisedTeamMemberDTO - Team member information for supervisor views
 * Includes hierarchy relationship data
 */
export interface SupervisedTeamMemberDTO {
  teamMemberId: number;
  workdayId: string | null;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
  teamMemberFullName: string;
  teamMemberSeniority: string;
  primaryRoleName: string | null;
  countryId: number | null;
  countryName: string | null;
  countryIso: string | null;
  reportType: ReportType;
  reportLevel: number;
  supervisorAssignmentStartDate: Date;
  supervisorAssignmentEndDate: Date | null;
  teamMemberEndDate: Date | null;
  teamMemberStartDate: Date | null;
  hireDate: Date | null;
}

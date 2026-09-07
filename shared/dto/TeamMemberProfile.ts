import type { TeamMemberReportDTO } from './TeamMemberReport';

/**
 * Combined DTO for the team member profile page.
 * Extends TeamMemberReportDTO (returned by getReports()) with Workday HR data.
 * All workday fields are nullable — a team member may have no linked workdayId.
 */
export interface TeamMemberProfileDTO extends TeamMemberReportDTO {
  hireDate: Date | null;
  corporateEmail: string | null;
  personalEmail: string | null;
  cellphone: string | null;
  homePhone: string | null;
  birthDate: string | null;
  parenthood: boolean | null;
  workStyle: string | null;
  gender: string | null;
  billingStatus: string | null;
  costCenterHierarchy: string | null;
  costCenterNames: string | null;
  directManager: string | null;
  vacation: number | null;
  personalDays: number | null;
}

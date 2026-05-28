import type { TeamMemberReportDTO } from './TeamMemberReport';

export interface SupervisorTeamOverviewDTO extends TeamMemberReportDTO {
  vacationBalance: number | null;
}

/**
 * DTOs for Team Member On Call — External Intake
 * Maps to ds.tmo_team_member_oncall via the same create path as the internal route.
 * External callers submit entries keyed by Workday ID (not teamMemberId); every
 * inserted record always has payrolId: null — the payroll period is assigned later
 * through the existing internal on-call editing flow.
 */

export interface TeamMemberOncallExternalEntryDTO {
  workdayId: string;
  amount: number;
  date: string;
  frequency: number;
}

export interface SubmitTeamMemberOncallExternalEntriesDTO {
  entries: TeamMemberOncallExternalEntryDTO[];
}

export interface TeamMemberOncallExternalEntryResultDTO {
  index: number;
  workdayId: string;
  success: boolean;
  oncallId?: number;
  error?: string;
}

export interface SubmitTeamMemberOncallExternalEntriesResponseDTO {
  results: TeamMemberOncallExternalEntryResultDTO[];
  insertedCount: number;
  failedCount: number;
}

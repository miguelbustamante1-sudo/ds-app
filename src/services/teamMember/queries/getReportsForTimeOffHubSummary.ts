/**
 * Dedicated wrapper for the Time Off Hub summary cards + drill-down page.
 * Follows the canonical pattern: calls getReports() internally and returns
 * only the fields the summary loaders need.
 */

import { getReports } from './getReports';

export interface TimeOffHubSummaryTeamMember {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

/**
 * @param supervisorId         team member ID of the supervisor (req.user.teamMemberId)
 * @param includeFullHierarchy false → direct reports only, true → full recursive hierarchy
 */
export async function getReportsForTimeOffHubSummary(
  supervisorId: number,
  includeFullHierarchy: boolean,
): Promise<TimeOffHubSummaryTeamMember[]> {
  const reports = await getReports(supervisorId, includeFullHierarchy);
  return reports.map((r) => ({
    teamMemberId: r.teamMemberId,
    teamMemberNames: r.teamMemberNames,
    teamMemberSurnames: r.teamMemberSurnames,
    workdayId: r.workdayId,
  }));
}

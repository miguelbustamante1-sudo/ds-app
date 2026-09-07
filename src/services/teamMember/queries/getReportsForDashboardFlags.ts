/**
 * Dedicated wrapper for the Dashboard "Weekly Flags" panel.
 * Follows the canonical pattern (src/services/teamMember/CLAUDE.md): calls
 * getReports() internally and returns only the fields the flags loader needs.
 *
 * Scoped to direct reports only — indirect reports are out of scope for a
 * supervisor's personal flags list, same restriction as getReportsForDashboardTasks.
 */

import { getReports } from './getReports';

export interface DashboardFlagsTeamMember {
  teamMemberId: number;
  workdayId: string | null;
  teamMemberNames: string;
  teamMemberSurnames: string;
}

export async function getReportsForDashboardFlags(
  supervisorId: number,
): Promise<DashboardFlagsTeamMember[]> {
  const reports = await getReports(supervisorId, false);
  return reports.map((r) => ({
    teamMemberId: r.teamMemberId,
    workdayId: r.workdayId,
    teamMemberNames: r.teamMemberNames,
    teamMemberSurnames: r.teamMemberSurnames,
  }));
}

/**
 * Dedicated wrapper for the Dashboard "Awaiting Your Action" panel.
 * Follows the canonical pattern (CodingHints §12): calls getReports() internally
 * and returns only the fields the dashboard tasks loader needs.
 *
 * Scoped to direct reports only — indirect reports are out of scope for a
 * supervisor's personal action list.
 */

import { getReports } from './getReports';

export interface DashboardTasksTeamMember {
  teamMemberId: number;
}

export async function getReportsForDashboardTasks(
  supervisorId: number,
): Promise<DashboardTasksTeamMember[]> {
  const reports = await getReports(supervisorId, false);
  return reports.map((r) => ({ teamMemberId: r.teamMemberId }));
}

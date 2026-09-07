import { getReports } from './getReports';
import { getAllActiveTeamMembers } from './getAllActiveTeamMembers';

/**
 * Returns the Workday IDs of team members that fall under a supervisor's
 * full hierarchy (direct + indirect, depth 10). oin_other_incomes keys on
 * wdid, so this filters out any report with no Workday ID on file rather
 * than returning their internal teamMemberId.
 * When viewAll is true, returns all active team members' wdids regardless of hierarchy.
 * Consumed exclusively by the Other Incomes feature's non-admin scope.
 */
export async function getReportsForOtherIncomes(
  supervisorId: number,
  viewAll = false,
): Promise<string[]> {
  const reports = viewAll
    ? await getAllActiveTeamMembers()
    : await getReports(supervisorId, true);
  return reports
    .map((r) => r.workdayId)
    .filter((wdid): wdid is string => wdid !== null);
}

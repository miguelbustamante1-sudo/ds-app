import { getReports } from './getReports';
import { getAllActiveTeamMembers } from './getAllActiveTeamMembers';

/**
 * Returns all subordinate team member IDs in the full recursive reporting
 * hierarchy under the given supervisor (up to depth 10).
 * When viewAll is true, returns all active team member IDs regardless of hierarchy.
 */
export async function getAllSubordinateIdsForCompensatoryTime(
  supervisorId: number,
  viewAll = false,
): Promise<number[]> {
  const reports = viewAll
    ? await getAllActiveTeamMembers()
    : await getReports(supervisorId, true);
  return reports.map((r) => r.teamMemberId);
}

/**
 * Returns the team member IDs of direct reports only (depth 1).
 * When viewAll is true, returns all active team member IDs.
 */
export async function getDirectReportIdsForCompensatoryTime(
  supervisorId: number,
  viewAll = false,
): Promise<number[]> {
  const reports = viewAll
    ? await getAllActiveTeamMembers()
    : await getReports(supervisorId, false);
  return reports.map((r) => r.teamMemberId);
}

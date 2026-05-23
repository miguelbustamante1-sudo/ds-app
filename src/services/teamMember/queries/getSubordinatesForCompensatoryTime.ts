import { getReports } from './getReports';

/**
 * Returns all subordinate team member IDs in the full recursive reporting
 * hierarchy under the given supervisor (up to depth 10).
 * The supervisor themselves are not included.
 */
export async function getAllSubordinateIdsForCompensatoryTime(
  supervisorId: number,
): Promise<number[]> {
  const reports = await getReports(supervisorId, true);
  return reports.map((r) => r.teamMemberId);
}

/**
 * Returns the team member IDs of direct reports only (depth 1)
 * for the given supervisor.
 */
export async function getDirectReportIdsForCompensatoryTime(
  supervisorId: number,
): Promise<number[]> {
  const reports = await getReports(supervisorId, false);
  return reports.map((r) => r.teamMemberId);
}

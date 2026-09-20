import { getReports } from './getReports';

/**
 * Returns the list of teamMemberIds that fall under a supervisor's
 * full hierarchy (direct + indirect, depth 10).
 * Consumed exclusively by the holiday swap change-history access check.
 */
export async function getReportsForHolidaySwapHistory(
  supervisorId: number,
): Promise<number[]> {
  const reports = await getReports(supervisorId, true);
  return reports.map((r) => r.teamMemberId);
}

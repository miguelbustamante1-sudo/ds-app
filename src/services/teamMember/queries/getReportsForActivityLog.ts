import { getReports } from './getReports';

/**
 * Returns the list of teamMemberIds that fall under a supervisor's
 * full hierarchy (direct + indirect, depth 10).
 * Consumed exclusively by the TimeOff Activity Log service.
 */
export async function getReportsForActivityLog(supervisorId: number): Promise<number[]> {
  const reports = await getReports(supervisorId, true);
  return reports.map((r) => r.teamMemberId);
}

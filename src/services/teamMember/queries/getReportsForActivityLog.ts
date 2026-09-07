import { getReports } from './getReports';
import { getAllActiveTeamMembers } from './getAllActiveTeamMembers';

/**
 * Returns the list of teamMemberIds that fall under a supervisor's
 * full hierarchy (direct + indirect, depth 10).
 * When viewAll is true, returns all active team member IDs regardless of hierarchy.
 * Consumed exclusively by the TimeOff Activity Log service.
 */
export async function getReportsForActivityLog(
  supervisorId: number,
  viewAll = false,
): Promise<number[]> {
  const reports = viewAll
    ? await getAllActiveTeamMembers()
    : await getReports(supervisorId, true);
  return reports.map((r) => r.teamMemberId);
}

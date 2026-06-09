import { getReports } from './getReports';
import { getAllActiveTeamMembers } from './getAllActiveTeamMembers';

export async function getReportsForWorkdayReconciliation(
  supervisorTmId: number,
  viewAll = false,
): Promise<number[]> {
  const reports = viewAll
    ? await getAllActiveTeamMembers()
    : await getReports(supervisorTmId, true);
  return reports.map((r) => r.teamMemberId);
}

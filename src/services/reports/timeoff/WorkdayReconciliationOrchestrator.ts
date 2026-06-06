import { getReports } from '../../teamMember/queries/getReports';
import { getAllActiveTeamMembers } from '../../teamMember/queries/getAllActiveTeamMembers';
import type { WorkdayReconciliationRowDTO } from '@shared/dto/WorkdayReconciliation';
import { queryWorkdayReconciliation } from './components/QueryWorkdayReconciliation';

export async function getWorkdayReconciliation(
  supervisorTmId: number,
  viewAll = false,
): Promise<WorkdayReconciliationRowDTO[]> {
  const reports = viewAll
    ? await getAllActiveTeamMembers()
    : await getReports(supervisorTmId, true);
  const supervisedIds = reports.map((r) => r.teamMemberId);

  return queryWorkdayReconciliation(supervisedIds);
}

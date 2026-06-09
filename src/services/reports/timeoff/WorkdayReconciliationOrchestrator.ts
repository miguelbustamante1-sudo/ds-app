import { getReportsForWorkdayReconciliation } from '../../teamMember/queries/getReportsForWorkdayReconciliation';
import type { WorkdayReconciliationRowDTO } from '@shared/dto/WorkdayReconciliation';
import { queryWorkdayReconciliation } from './components/QueryWorkdayReconciliation';

export async function getWorkdayReconciliation(
  supervisorTmId: number,
  viewAll = false,
): Promise<WorkdayReconciliationRowDTO[]> {
  const supervisedIds = await getReportsForWorkdayReconciliation(supervisorTmId, viewAll);

  return queryWorkdayReconciliation(supervisedIds);
}

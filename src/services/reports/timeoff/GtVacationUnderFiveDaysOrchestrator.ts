import { getReportsForGtVacationUnderFiveDays } from '../../teamMember/queries/getReportsForGtVacationUnderFiveDays';
import type { GtVacationUnderFiveDaysRowDTO } from '@shared/dto/GtVacationUnderFiveDays';
import { queryGtVacationUnderFiveDays } from './components/QueryGtVacationUnderFiveDays';

export async function getGtVacationUnderFiveDays(
  supervisorTmId: number,
  viewAll = false,
): Promise<GtVacationUnderFiveDaysRowDTO[]> {
  const supervisedIds = await getReportsForGtVacationUnderFiveDays(supervisorTmId, viewAll);
  return queryGtVacationUnderFiveDays(supervisedIds);
}

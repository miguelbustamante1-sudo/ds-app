import { AppError } from '../../../errors/AppError';
import { getReports } from '../../teamMember/queries/getReports';
import { queryUpcomingVacation } from './components/QueryUpcomingVacation';
import type { UpcomingVacationRowDTO } from '@shared/dto/UpcomingVacation';

const DEFAULT_DAYS = 45;
const MAX_DAYS = 365;

export async function getUpcomingVacation(
  supervisorTmId: number,
  teamMemberIdRaw: number | null,
  daysRaw: number,
): Promise<UpcomingVacationRowDTO[]> {
  const days = Math.min(MAX_DAYS, Math.max(1, daysRaw || DEFAULT_DAYS));

  const reports = await getReports(supervisorTmId, true);
  const supervisedIds = reports.map((r) => r.teamMemberId);

  let teamMemberId: number | null = null;
  if (teamMemberIdRaw !== null) {
    if (!supervisedIds.includes(teamMemberIdRaw)) {
      throw new AppError('Team member is not in your reporting chain', 403);
    }
    teamMemberId = teamMemberIdRaw;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() + days);

  return queryUpcomingVacation(supervisedIds, today, cutoffDate, teamMemberId);
}

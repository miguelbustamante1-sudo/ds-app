import type { SupervisorTeamOverviewDTO } from '@shared/dto/SupervisorTeamOverview';
import { getWorkdayBalance } from '../../timeoff/components/GetWorkdayBalance';
import { getReports } from './getReports';

export async function getReportsForTeamOverview(
  supervisorTeamMemberId: number
): Promise<SupervisorTeamOverviewDTO[]> {
  const reports = await getReports(supervisorTeamMemberId, true);

  const enriched = await Promise.all(
    reports.map(async (member) => {
      try {
        const balance = await getWorkdayBalance(member.teamMemberId);
        return { ...member, vacationBalance: balance.vacation };
      } catch {
        return { ...member, vacationBalance: null };
      }
    })
  );

  return enriched;
}

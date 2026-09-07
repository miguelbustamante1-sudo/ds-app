import type { SupervisorTeamOverviewDTO } from '@shared/dto/SupervisorTeamOverview';
import { getWorkdayBalance } from '../../timeoff/components/GetWorkdayBalance';
import { getReports } from './getReports';
import { getAllActiveTeamMembers } from './getAllActiveTeamMembers';

export async function getReportsForTeamOverview(
  supervisorTeamMemberId: number,
  viewAll = false,
): Promise<SupervisorTeamOverviewDTO[]> {
  const reports = viewAll
    ? await getAllActiveTeamMembers()
    : await getReports(supervisorTeamMemberId, true);

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

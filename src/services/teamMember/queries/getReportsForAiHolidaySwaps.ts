import { getReports } from './getReports';
import { prisma } from '../../../db/prisma';
import { loadStatusIds } from '../../holidaySwap/components/LoadStatusIds';

export interface TeamHolidaySwapDTO {
  teamMemberFullName: string;
  holidayName: string;
  originalDate: string;
  replacementDate: string;
  statusName: string;
}

/**
 * Returns all active approved holiday swaps for every team member
 * under `supervisorTeamMemberId`. Single batch query after hierarchy resolution.
 *
 * Rule 3.6 compliant: uses canonical getReports() — no custom CTE.
 * No internal IDs returned — safe to pass directly to the AI tool layer.
 */
export async function getReportsForAiHolidaySwaps(
  supervisorTeamMemberId: number
): Promise<TeamHolidaySwapDTO[]> {
  const reports = await getReports(supervisorTeamMemberId, true);
  const teamMemberIds = reports.map((r) => r.teamMemberId);

  if (teamMemberIds.length === 0) return [];

  const statusIds = await loadStatusIds();

  const swaps = await prisma.holidaySwap.findMany({
    where: {
      teamMemberId: { in: teamMemberIds },
      statusId: statusIds.approved,
      active: true,
    },
    include: {
      holiday: { select: { holidayName: true } },
      teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
      status: { select: { statusName: true } },
    },
    orderBy: { replacementDate: 'asc' },
  });

  return swaps.map((s) => ({
    teamMemberFullName: `${s.teamMember.teamMemberNames} ${s.teamMember.teamMemberSurnames}`,
    holidayName: s.holiday.holidayName,
    originalDate: s.originalDate.toISOString(),
    replacementDate: s.replacementDate.toISOString(),
    statusName: s.status.statusName,
  }));
}

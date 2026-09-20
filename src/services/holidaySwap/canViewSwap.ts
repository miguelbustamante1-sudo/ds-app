import { getReportsForHolidaySwapHistory } from '../teamMember/queries/getReportsForHolidaySwapHistory';

export async function canViewSwap(requestingTeamMemberId: number, swapTeamMemberId: number): Promise<boolean> {
  if (swapTeamMemberId === requestingTeamMemberId) return true;
  const reportTeamMemberIds = await getReportsForHolidaySwapHistory(requestingTeamMemberId);
  return reportTeamMemberIds.includes(swapTeamMemberId);
}

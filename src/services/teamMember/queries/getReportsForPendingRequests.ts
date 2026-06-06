/**
 * Dedicated wrapper for the Supervisor Pending Requests page.
 * Follows the canonical pattern (CodingHints §12): calls getReports() internally
 * and returns only the fields the pending-requests loaders need.
 */

import { getReports } from './getReports';
import { getAllActiveTeamMembers } from './getAllActiveTeamMembers';

export interface PendingRequestsTeamMember {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
}

export async function getReportsForPendingRequests(
  supervisorId: number,
  viewAll = false,
): Promise<PendingRequestsTeamMember[]> {
  const reports = viewAll
    ? await getAllActiveTeamMembers()
    : await getReports(supervisorId, true);
  return reports.map((r) => ({
    teamMemberId: r.teamMemberId,
    teamMemberNames: r.teamMemberNames,
    teamMemberSurnames: r.teamMemberSurnames,
  }));
}

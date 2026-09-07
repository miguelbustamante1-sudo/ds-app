import { getReports } from './getReports';

export interface AiContextReportDTO {
  teamMemberId: number;
}

/**
 * Returns direct reports only — used by the AI service to determine
 * whether the requesting user is a supervisor. Same semantics as
 * GET /api/team-members/is-supervisor.
 *
 * Rule 3.6 compliant: uses canonical getReports() — no custom CTE.
 */
export async function getReportsForAiContext(
  teamMemberId: number
): Promise<AiContextReportDTO[]> {
  const reports = await getReports(teamMemberId, false);
  return reports.map((r) => ({ teamMemberId: r.teamMemberId }));
}

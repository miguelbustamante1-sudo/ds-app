import { getReports } from './getReports';

/**
 * Returns direct reports for DTOS escalation resolution.
 * Used exclusively by the DTOS SLA escalation engine.
 */
export async function getReportsForWorkflowEscalation(supervisorId: number): Promise<number[]> {
  const reports = await getReports(supervisorId, false); // direct reports only
  return reports.map((r) => r.teamMemberId);
}

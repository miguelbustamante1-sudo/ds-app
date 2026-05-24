import { getReports } from './getReports';

/**
 * Returns direct reports for workflow DYNAMIC assignment resolution.
 * Used exclusively by the DTOS instantiation and task execution engine.
 */
export async function getReportsForWorkflow(supervisorId: number): Promise<number[]> {
  const reports = await getReports(supervisorId, false); // direct reports only
  return reports.map((r) => r.teamMemberId);
}

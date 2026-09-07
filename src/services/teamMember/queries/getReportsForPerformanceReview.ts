import { getReports } from './getReports';

export async function getReportsForPerformanceReview(supervisorId: number): Promise<number[]> {
  const reports = await getReports(supervisorId, true);
  return reports.map((r) => r.teamMemberId);
}

import { getReports } from './getReports';

export interface DirectReportDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
}

/**
 * Returns the direct reports (depth 1) of a supervisor.
 * Consumed exclusively by the Recurring Task Template service
 * when generating per-direct-report task instances.
 */
export async function getReportsForRecurringTasks(
  supervisorId: number,
): Promise<DirectReportDTO[]> {
  const reports = await getReports(supervisorId, false);
  return reports.map((r) => ({
    teamMemberId: r.teamMemberId,
    teamMemberNames: r.teamMemberNames,
    teamMemberSurnames: r.teamMemberSurnames,
  }));
}

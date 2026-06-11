import { getReports } from './getReports';

export interface TpReportDTO {
  teamMemberId: number;
  workdayId: string | null;
  teamMemberNames: string;
  teamMemberSurnames: string;
}

export async function getReportsForTopPerformers(supervisorId: number): Promise<TpReportDTO[]> {
  const reports = await getReports(supervisorId, true);
  return reports.map((r) => ({
    teamMemberId: r.teamMemberId,
    workdayId: r.workdayId ?? null,
    teamMemberNames: r.teamMemberNames,
    teamMemberSurnames: r.teamMemberSurnames,
  }));
}

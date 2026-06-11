import { getReports } from './getReports';

export interface TpReportDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
}

export async function getReportsForTopPerformers(supervisorId: number): Promise<TpReportDTO[]> {
  const reports = await getReports(supervisorId, true);
  return reports.map((r) => ({
    teamMemberId: r.teamMemberId,
    teamMemberNames: r.teamMemberNames,
    teamMemberSurnames: r.teamMemberSurnames,
  }));
}

import { getReports } from './getReports';

export interface BonusImpactReportDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
}

export async function getReportsForBonusImpact(supervisorId: number): Promise<BonusImpactReportDTO[]> {
  const reports = await getReports(supervisorId, true);
  return reports.map((r) => ({
    teamMemberId: r.teamMemberId,
    teamMemberNames: r.teamMemberNames,
    teamMemberSurnames: r.teamMemberSurnames,
  }));
}

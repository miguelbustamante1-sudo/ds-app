import { getReports } from './getReports';

/**
 * Returns a map of teamMemberId → report level for all subordinates of
 * the given supervisor. Used to annotate compensatory time records with
 * the submitter's depth in the hierarchy.
 */
export async function getReportLevelMapForCompensatoryTime(
  supervisorId: number,
): Promise<Map<number, number>> {
  const reports = await getReports(supervisorId, true);
  const map = new Map<number, number>();
  for (const r of reports) {
    map.set(r.teamMemberId, r.reportLevel);
  }
  return map;
}

/**
 * Feature wrapper for the project-assignment Add Member dialog.
 *
 * Calls the canonical getReports() and applies business filtering
 * in application code — no extra DB query.
 */

import { getReports } from './getReports';
import type { AvailableForProjectDTO } from '@shared/dto/TeamMemberReport';

/**
 * Returns team members in the supervisor's full hierarchy that:
 * - are NOT already assigned to the target project
 * - have totalAllocation < 100
 * - optionally match the name search string `q`
 *
 * Allocation totals are computed from currentProjects in application code.
 */
export async function getAvailableForProject(
  supervisorId: number,
  projectId: number,
  q?: string,
): Promise<AvailableForProjectDTO[]> {
  const all = await getReports(supervisorId, true);

  const withAllocation = all.map((tm) => {
    const totalAllocation = tm.currentProjects.reduce(
      (sum, p) => sum + p.projectAssignmentAllocation,
      0,
    );
    return { ...tm, totalAllocation, availableAllocation: 100 - totalAllocation };
  });

  return withAllocation.filter((tm) => {
    const alreadyAssigned = tm.currentProjects.some((p) => p.projectId === projectId);
    if (alreadyAssigned) return false;

    if (tm.totalAllocation >= 100) return false;

    if (q) {
      const full = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`.toLowerCase();
      if (!full.includes(q.toLowerCase())) return false;
    }

    return true;
  });
}

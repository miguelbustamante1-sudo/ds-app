import { prisma } from '../../../db/prisma';

export type OrgHierarchyPosition = 'TEAM_LEADER' | 'OM' | 'AGM';

interface HierarchyRow {
  hbt_team_leader_wdid: string | null;
  hbt_om_wdid: string | null;
  hbt_agm_wdid: string | null;
}

/**
 * Resolves the Team Leader / OM / AGM above a given team member via
 * ds.hbt_hierarchy_by_teammember. That view is not modeled in Prisma and
 * has no reliable unique key — a multi-reporting employee can produce more
 * than one row (one per reporting line) — so the first match is used, same
 * "first wins" precedent as getFirstSupervisorForWorkflow.
 * Used exclusively by workflow DYNAMIC_TD_HIERARCHY assignment resolution.
 */
export async function getOrgPositionForWorkflow(
  teamMemberId: number,
  position: OrgHierarchyPosition,
): Promise<number | null> {
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: { workdayId: true },
  });
  if (!teamMember?.workdayId) return null;

  const rows = await prisma.$queryRaw<HierarchyRow[]>`
    SELECT hbt_team_leader_wdid, hbt_om_wdid, hbt_agm_wdid
    FROM ds.hbt_hierarchy_by_teammember
    WHERE hbt_wdid = ${teamMember.workdayId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  const resolvedWdid =
    position === 'TEAM_LEADER' ? row.hbt_team_leader_wdid :
    position === 'OM' ? row.hbt_om_wdid :
    row.hbt_agm_wdid;

  if (!resolvedWdid) return null;

  const resolvedMember = await prisma.teamMember.findUnique({
    where: { workdayId: resolvedWdid },
    select: { teamMemberId: true },
  });

  return resolvedMember?.teamMemberId ?? null;
}

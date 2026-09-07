import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';

interface HierarchyNameRow {
  hbt_wdid: string;
  hbt_team_leader: string | null;
  hbt_om: string | null;
}

/**
 * Resolves each given workday ID's Team Leader name, falling back to their OM
 * name when there is no Team Leader, via ds.hbt_hierarchy_by_teammember. That
 * view is not modeled in Prisma and has no reliable unique key — a
 * multi-reporting employee can produce more than one row — so the first match
 * per workday ID wins, same "first wins" precedent as getOrgPositionForWorkflow.
 *
 * Batched (single IN(...) query) for resolving a whole list of flags at once,
 * not a per-row lookup.
 */
export async function getTeamLeaderOrOmNames(
  workdayIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (workdayIds.length === 0) return map;

  const rows = await prisma.$queryRaw<HierarchyNameRow[]>`
    SELECT hbt_wdid, hbt_team_leader, hbt_om
    FROM ds.hbt_hierarchy_by_teammember
    WHERE hbt_wdid IN (${Prisma.join(workdayIds)})
  `;

  for (const row of rows) {
    if (map.has(row.hbt_wdid)) continue;
    map.set(row.hbt_wdid, row.hbt_team_leader ?? row.hbt_om ?? null);
  }
  return map;
}

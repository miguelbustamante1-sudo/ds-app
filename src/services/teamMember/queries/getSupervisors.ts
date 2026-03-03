/**
 * Canonical upward supervisor chain query.
 *
 * Walks the hierarchy from a team member upward through their supervisor
 * assignments, up to 3 levels deep. Only active assignments (where today
 * falls between txs_stadat and txs_enddat) are included.
 *
 * This is the inverse of getReports() — it goes up instead of down.
 * All consumers must call this function; never duplicate this CTE.
 */

import { prisma } from '../../../db/prisma';

interface RawSupervisorChain {
  supervisor_id: number;
}

/**
 * Returns the teamMemberId values of supervisors above the given team member,
 * up to 3 levels up. Returns a flat, deduplicated list.
 *
 * @param teamMemberId - The team member whose supervisor chain to resolve
 */
export async function getSupervisors(teamMemberId: number): Promise<number[]> {
  const today = new Date();

  const results = await prisma.$queryRaw<RawSupervisorChain[]>`
    WITH RECURSIVE supervisor_chain AS (
      -- Base: direct supervisor(s) of the given team member
      SELECT sa.sup_id AS supervisor_id, 1 AS depth
      FROM ds.tbl_tms_x_supervisor sa
      WHERE sa.tms_id = ${teamMemberId}
        AND sa.txs_stadat <= ${today}
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${today})

      UNION ALL

      -- Recursive: supervisor's supervisor
      SELECT sa.sup_id, sc.depth + 1
      FROM ds.tbl_tms_x_supervisor sa
      INNER JOIN supervisor_chain sc ON sa.tms_id = sc.supervisor_id
      WHERE sa.txs_stadat <= ${today}
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${today})
        AND sc.depth < 3
    )
    SELECT DISTINCT supervisor_id FROM supervisor_chain
  `;

  return results.map((r) => Number(r.supervisor_id));
}

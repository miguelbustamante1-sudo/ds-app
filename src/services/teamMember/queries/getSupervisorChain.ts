/**
 * Walks the SupervisorAssignment hierarchy upward from a given team member,
 * returning up to 3 structured levels with full name fields.
 *
 * Extends the same recursive CTE pattern used in getSupervisors.ts but also
 * JOINs tbl_team_members to resolve name fields, returning SupervisorChainDTO[].
 */

import { prisma } from '../../../db/prisma';
import type { SupervisorChainDTO } from '@shared/dto/Bench';

interface RawSupervisorChainRow {
  supervisor_id: number;
  depth: number;
  tms_names: string;
  tms_surnames: string;
  tms_knownas: string | null;
}

/**
 * Returns the supervisor chain above the given team member, up to 3 levels.
 * Ordered depth ascending: depth 1 = direct supervisor (L1).
 * Returns an empty array if the TM has no active supervisor assignment.
 *
 * @param teamMemberId - The team member whose supervisor chain to resolve
 */
export async function getSupervisorChain(teamMemberId: number): Promise<SupervisorChainDTO[]> {
  const today = new Date();

  const results = await prisma.$queryRaw<RawSupervisorChainRow[]>`
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
    ),
    -- Keep shallowest depth when the same supervisor appears at multiple levels
    ranked AS (
      SELECT DISTINCT ON (supervisor_id)
        supervisor_id,
        depth
      FROM supervisor_chain
      ORDER BY supervisor_id, depth ASC
    )
    SELECT
      r.supervisor_id,
      r.depth,
      tm.tms_names,
      tm.tms_surnames,
      tm.tms_known_as AS tms_knownas
    FROM ranked r
    INNER JOIN ds.tbl_team_members tm ON tm.tms_id = r.supervisor_id
    ORDER BY r.depth ASC
  `;

  return results.map((row): SupervisorChainDTO => ({
    level: row.depth as 1 | 2 | 3,
    teamMemberId: Number(row.supervisor_id),
    teamMemberNames: row.tms_names,
    teamMemberSurnames: row.tms_surnames,
    teamMemberKnownAs: row.tms_knownas,
  }));
}

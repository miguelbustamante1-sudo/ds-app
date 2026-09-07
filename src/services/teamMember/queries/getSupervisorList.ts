/**
 * Returns all team members who currently act as a supervisor — i.e., have at
 * least one active SupervisorAssignment (txs_enddat IS NULL OR txs_enddat >= today).
 *
 * Used by the Bench Move form to populate the "new supervisor" ComboBox.
 */

import { prisma } from '../../../db/prisma';

export interface SupervisorListItemDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
}

interface RawSupervisorListItem {
  tms_id: number;
  tms_names: string;
  tms_surnames: string;
  tms_known_as: string | null;
}

export async function getSupervisorList(): Promise<SupervisorListItemDTO[]> {
  const today = new Date();

  const results = await prisma.$queryRaw<RawSupervisorListItem[]>`
    SELECT DISTINCT
      tm.tms_id,
      tm.tms_names,
      tm.tms_surnames,
      tm.tms_known_as
    FROM ds.tbl_tms_x_supervisor sa
    INNER JOIN ds.tbl_team_members tm ON tm.tms_id = sa.sup_id
    WHERE sa.txs_stadat <= ${today}
      AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${today})
    ORDER BY tm.tms_surnames, tm.tms_names
  `;

  return results.map((row): SupervisorListItemDTO => ({
    teamMemberId: Number(row.tms_id),
    teamMemberNames: row.tms_names,
    teamMemberSurnames: row.tms_surnames,
    teamMemberKnownAs: row.tms_known_as,
  }));
}

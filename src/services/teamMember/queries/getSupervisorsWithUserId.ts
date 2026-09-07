import { prisma } from '../../../db/prisma';

export interface SupervisorWithUserIdDTO {
  teamMemberId: number;
  userId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
}

interface RawSupervisorWithUserId {
  tms_id: bigint | number;
  usr_id: bigint | number;
  tms_names: string;
  tms_surnames: string;
  tms_known_as: string | null;
}

export async function getSupervisorsWithUserId(): Promise<SupervisorWithUserIdDTO[]> {
  const today = new Date();

  const results = await prisma.$queryRaw<RawSupervisorWithUserId[]>`
    SELECT DISTINCT
      tm.tms_id,
      u.usr_id,
      tm.tms_names,
      tm.tms_surnames,
      tm.tms_known_as
    FROM ds.tbl_tms_x_supervisor sa
    INNER JOIN ds.tbl_team_members tm ON tm.tms_id = sa.sup_id
    INNER JOIN ds.tbl_users u ON u.tms_id = tm.tms_id
    WHERE sa.txs_stadat <= ${today}
      AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${today})
    ORDER BY tm.tms_surnames, tm.tms_names
  `;

  return results.map((row): SupervisorWithUserIdDTO => ({
    teamMemberId: Number(row.tms_id),
    userId: Number(row.usr_id),
    teamMemberNames: row.tms_names,
    teamMemberSurnames: row.tms_surnames,
    teamMemberKnownAs: row.tms_known_as,
  }));
}

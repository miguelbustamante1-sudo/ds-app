import { prisma } from '../../../db/prisma';

interface HierarchyByManagerRow {
  hbm_name_manager_l1: string | null;
  hbm_email_manager_l1: string | null;
}

export interface L1Manager {
  managerName: string | null;
  managerEmail: string | null;
}

/** Reads the DB view ds.hbm_hierarchy_by_manager (not modelled in Prisma). */
export async function getL1ManagerByWorkdayId(workdayId: string): Promise<L1Manager> {
  const rows = await prisma.$queryRaw<HierarchyByManagerRow[]>`
    SELECT hbm_name_manager_l1, hbm_email_manager_l1
    FROM ds.hbm_hierarchy_by_manager
    WHERE hbm_wdid = ${workdayId}
    LIMIT 1
  `;
  const row = rows[0];
  return {
    managerName: row?.hbm_name_manager_l1 ?? null,
    managerEmail: row?.hbm_email_manager_l1 ?? null,
  };
}

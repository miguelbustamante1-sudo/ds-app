import { prisma } from '../../../db/prisma';

export interface AttritionStatusIds {
  tentative: number;
  cancelled: number;
  split: number;
}

const TENTATIVE_NAME  = 'tentative';
const CANCELLED_NAME  = 'cancelled';
const SPLIT_STATUS_ID = 6;

export async function loadAttritionStatusIds(): Promise<AttritionStatusIds> {
  const statuses = await prisma.timeOffStatus.findMany({
    select: { statusId: true, statusName: true },
  });

  const byName = new Map(
    statuses.map((s) => [s.statusName.trim().toLowerCase(), s.statusId])
  );

  const tentative = byName.get(TENTATIVE_NAME);
  const cancelled = byName.get(CANCELLED_NAME);

  if (tentative === undefined) {
    throw new Error(`[Attrition] Required status 'Tentative' not found in tbl_to_statuses`);
  }
  if (cancelled === undefined) {
    throw new Error(`[Attrition] Required status 'Cancelled' not found in tbl_to_statuses`);
  }

  return { tentative, cancelled, split: SPLIT_STATUS_ID };
}

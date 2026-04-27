import { prisma } from '../../../db/prisma';

export interface SwapStatusIds {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  taken: number;
}

const STATUS_NAME_MAP: Record<keyof SwapStatusIds, string> = {
  pending: 'Tentative',
  approved: 'Acknowledged',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  taken: 'Taken',
};

export async function loadStatusIds(): Promise<SwapStatusIds> {
  const statuses = await prisma.timeOffStatus.findMany({
    select: { statusId: true, statusName: true },
  });

  const byName = new Map(statuses.map((s) => [s.statusName.trim().toLowerCase(), s.statusId]));

  const resolve = (key: keyof SwapStatusIds): number => {
    const name = STATUS_NAME_MAP[key].toLowerCase();
    const id = byName.get(name);
    if (id === undefined) {
      throw new Error(`Required TimeOffStatus '${STATUS_NAME_MAP[key]}' not found in database`);
    }
    return id;
  };

  return {
    pending: resolve('pending'),
    approved: resolve('approved'),
    rejected: resolve('rejected'),
    cancelled: resolve('cancelled'),
    taken: resolve('taken'),
  };
}

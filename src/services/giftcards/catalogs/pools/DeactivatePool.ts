import { prisma } from '../../../../db/prisma';
import type { GiftCardPoolDTO } from '../../../../../shared/dto/GiftCardPool';

export async function deactivatePool(id: number): Promise<boolean> {
  const existing = await prisma.giftCardPool.findUnique({
    where:  { poolId: id },
    select: { poolId: true },
  });
  if (!existing) return false;

  await prisma.giftCardPool.update({
    where: { poolId: id },
    data:  { poolIsActive: false },
  });
  return true;
}

export async function activatePool(id: number): Promise<GiftCardPoolDTO | null> {
  const existing = await prisma.giftCardPool.findUnique({
    where:  { poolId: id },
    select: {
      poolId:        true,
      poolCode:      true,
      poolName:      true,
      poolCreatedBy: true,
      poolCreatedAt: true,
      createdBy:     { select: { userName: true } },
    },
  });
  if (!existing) return null;

  await prisma.giftCardPool.update({
    where: { poolId: id },
    data:  { poolIsActive: true },
  });

  return {
    poolId:        existing.poolId,
    poolCode:      existing.poolCode,
    poolName:      existing.poolName,
    poolIsActive:  true,
    poolCreatedBy: existing.poolCreatedBy,
    poolCreatedByUserName: existing.createdBy?.userName ?? null,
    poolCreatedAt: existing.poolCreatedAt.toISOString(),
  };
}

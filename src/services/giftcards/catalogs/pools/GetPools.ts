import { prisma } from '../../../../db/prisma';
import type { GiftCardPoolDTO } from '../../../../../shared/dto/GiftCardPool';

const POOL_SELECT = {
  poolId:        true,
  poolCode:      true,
  poolName:      true,
  poolIsActive:  true,
  poolCreatedAt: true,
};

function mapPool(r: {
  poolId:        number;
  poolCode:      string;
  poolName:      string;
  poolIsActive:  boolean;
  poolCreatedAt: Date;
}): GiftCardPoolDTO {
  return {
    poolId:        r.poolId,
    poolCode:      r.poolCode,
    poolName:      r.poolName,
    poolIsActive:  r.poolIsActive,
    poolCreatedAt: r.poolCreatedAt.toISOString(),
  };
}

export async function getPools(): Promise<GiftCardPoolDTO[]> {
  const rows = await prisma.giftCardPool.findMany({
    select:  POOL_SELECT,
    orderBy: { poolId: 'asc' },
  });
  return rows.map(mapPool);
}

export async function getPoolById(id: number): Promise<GiftCardPoolDTO | null> {
  const row = await prisma.giftCardPool.findUnique({
    where:  { poolId: id },
    select: POOL_SELECT,
  });
  if (!row) return null;
  return mapPool(row);
}
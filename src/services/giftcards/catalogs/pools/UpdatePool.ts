import { prisma } from '../../../../db/prisma';
import type { GiftCardPoolDTO } from '../../../../../shared/dto/GiftCardPool';
import { ValidationError } from './CreatePool';

export interface UpdatePoolInput {
  poolCode?: string;
  poolName?: string;
}

export function validateUpdatePool(raw: Record<string, unknown>): UpdatePoolInput {
  const { poolCode, poolName } = raw;
  const data: UpdatePoolInput = {};

  if (poolCode !== undefined) {
    if (typeof poolCode !== 'string' || poolCode.trim() === '') {
      throw new ValidationError('`poolCode` must be a non-empty string');
    }
    data.poolCode = poolCode.trim().toUpperCase();
  }
  if (poolName !== undefined) {
    if (typeof poolName !== 'string' || poolName.trim() === '') {
      throw new ValidationError('`poolName` must be a non-empty string');
    }
    data.poolName = poolName.trim();
  }
  if (Object.keys(data).length === 0) {
    throw new ValidationError('At least one field must be provided: poolCode, poolName');
  }
  return data;
}

export async function updatePool(
  id:   number,
  data: UpdatePoolInput,
): Promise<GiftCardPoolDTO | null> {
  try {
    const row = await prisma.giftCardPool.update({
      where: { poolId: id },
      data: {
        ...(data.poolCode !== undefined && { poolCode: data.poolCode }),
        ...(data.poolName !== undefined && { poolName: data.poolName }),
      },
      select: {
        poolId:        true,
        poolCode:      true,
        poolName:      true,
        poolIsActive:  true,
        poolCreatedAt: true,
      },
    });
    return {
      poolId:        row.poolId,
      poolCode:      row.poolCode,
      poolName:      row.poolName,
      poolIsActive:  row.poolIsActive,
      poolCreatedAt: row.poolCreatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}
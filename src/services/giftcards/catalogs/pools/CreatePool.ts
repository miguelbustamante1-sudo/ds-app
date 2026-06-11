import { prisma } from '../../../../db/prisma';
import type { GiftCardPoolDTO } from '../../../../../shared/dto/GiftCardPool';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface CreatePoolInput {
  poolCode:      string;
  poolName:      string;
  poolCreatedBy: number;
}

export function validateCreatePool(
  raw:           Record<string, unknown>,
  poolCreatedBy: number,
): CreatePoolInput {
  const { poolCode, poolName } = raw;

  if (typeof poolCode !== 'string' || poolCode.trim() === '') {
    throw new ValidationError('`poolCode` is required and must be a non-empty string');
  }
  if (typeof poolName !== 'string' || poolName.trim() === '') {
    throw new ValidationError('`poolName` is required and must be a non-empty string');
  }

  return {
    poolCode:      poolCode.trim().toUpperCase(),
    poolName:      poolName.trim(),
    poolCreatedBy: poolCreatedBy,
  };
}

export async function createPool(data: CreatePoolInput): Promise<GiftCardPoolDTO> {
  const row = await prisma.giftCardPool.create({
    data: {
      poolCode:      data.poolCode,
      poolName:      data.poolName,
      poolCreatedBy: data.poolCreatedBy,
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
}
import { prisma } from '../../../../db/prisma';
import type { GiftCardReasonDTO } from '../../../../../shared/dto/GiftCardReason';
import { GiftCardValidationError } from '../../errors';

export interface CreateReasonInput {
  reasonName:      string;
  reasonCreatedBy: number;
}

export function validateCreateReason(
  raw:             Record<string, unknown>,
  reasonCreatedBy: number,
): CreateReasonInput {
  const { reasonName } = raw;

  if (typeof reasonName !== 'string' || reasonName.trim() === '') {
    throw new GiftCardValidationError('`reasonName` is required and must be a non-empty string');
  }

  return {
    reasonName:      reasonName.trim(),
    reasonCreatedBy: reasonCreatedBy,
  };
}

export async function createReason(data: CreateReasonInput): Promise<GiftCardReasonDTO> {
  const row = await prisma.giftCardReason.create({
    data: {
      reasonName:      data.reasonName,
      reasonCreatedBy: data.reasonCreatedBy,
    },
    select: {
      reasonId:        true,
      reasonName:      true,
      reasonIsActive:  true,
      reasonCreatedAt: true,
    },
  });

  return {
    reasonId:        row.reasonId,
    reasonName:      row.reasonName,
    reasonIsActive:  row.reasonIsActive,
    reasonCreatedAt: row.reasonCreatedAt.toISOString(),
  };
}

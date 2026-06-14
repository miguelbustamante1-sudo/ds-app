import { prisma } from '../../../../db/prisma';
import type { GiftCardReasonDTO } from '../../../../../shared/dto/GiftCardReason';
import { ValidationError } from './CreateReason';

export interface UpdateReasonInput {
  reasonName?: string;
}

export function validateUpdateReason(raw: Record<string, unknown>): UpdateReasonInput {
  const { reasonName } = raw;
  const data: UpdateReasonInput = {};

  if (reasonName !== undefined) {
    if (typeof reasonName !== 'string' || reasonName.trim() === '') {
      throw new ValidationError('`reasonName` must be a non-empty string');
    }
    data.reasonName = reasonName.trim();
  }
  if (Object.keys(data).length === 0) {
    throw new ValidationError('At least one field must be provided: reasonName');
  }
  return data;
}

export async function updateReason(
  id:   number,
  data: UpdateReasonInput,
): Promise<GiftCardReasonDTO | null> {
  try {
    const row = await prisma.giftCardReason.update({
      where: { reasonId: id },
      data: {
        ...(data.reasonName !== undefined && { reasonName: data.reasonName }),
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
  } catch {
    return null;
  }
}
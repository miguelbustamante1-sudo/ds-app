import { prisma } from '../../../../db/prisma';
import type { GiftCardTypeDTO } from '../../../../../shared/dto/GiftCardType';
import { ValidationError } from './CreateCardType';

export interface UpdateCardTypeInput {
  cardTypeName?: string;
}

export function validateUpdateCardType(raw: Record<string, unknown>): UpdateCardTypeInput {
  const { cardTypeName } = raw;
  const data: UpdateCardTypeInput = {};

  if (cardTypeName !== undefined) {
    if (typeof cardTypeName !== 'string' || cardTypeName.trim() === '') {
      throw new ValidationError('`cardTypeName` must be a non-empty string');
    }
    data.cardTypeName = cardTypeName.trim();
  }
  if (Object.keys(data).length === 0) {
    throw new ValidationError('At least one field must be provided: cardTypeName');
  }
  return data;
}

export async function updateCardType(
  id:   number,
  data: UpdateCardTypeInput,
): Promise<GiftCardTypeDTO | null> {
  try {
    const row = await prisma.giftCardType.update({
      where: { cardTypeId: id },
      data: {
        ...(data.cardTypeName !== undefined && { cardTypeName: data.cardTypeName }),
      },
      select: {
        cardTypeId:        true,
        cardTypeName:      true,
        cardTypeIsActive:  true,
        cardTypeCreatedAt: true,
      },
    });
    return {
      cardTypeId:        row.cardTypeId,
      cardTypeName:      row.cardTypeName,
      cardTypeIsActive:  row.cardTypeIsActive,
      cardTypeCreatedAt: row.cardTypeCreatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}
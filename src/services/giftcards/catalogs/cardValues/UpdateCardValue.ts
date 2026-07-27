import { prisma } from '../../../../db/prisma';
import type { GiftCardValueDTO } from '../../../../../shared/dto/GiftCardValue';
import { GiftCardValidationError } from '../../errors';

export interface UpdateCardValueInput {
  cardValueAmount?:   number;
  cardValueCurrency?: string;
}

export function validateUpdateCardValue(
  raw: Record<string, unknown>,
): UpdateCardValueInput {
  const result: UpdateCardValueInput = {};

  if (raw.cardValueAmount !== undefined) {
    if (typeof raw.cardValueAmount !== 'number' || raw.cardValueAmount <= 0) {
      throw new GiftCardValidationError('`cardValueAmount` must be a positive number');
    }
    result.cardValueAmount = raw.cardValueAmount;
  }

  if (raw.cardValueCurrency !== undefined) {
    if (typeof raw.cardValueCurrency !== 'string' || raw.cardValueCurrency.trim() === '') {
      throw new GiftCardValidationError('`cardValueCurrency` must be a non-empty string');
    }
    result.cardValueCurrency = raw.cardValueCurrency.trim().toUpperCase();
  }

  if (!result.cardValueAmount && !result.cardValueCurrency) {
    throw new GiftCardValidationError('At least one field (cardValueAmount or cardValueCurrency) is required');
  }

  return result;
}

export async function updateCardValue(
  id: number,
  data: UpdateCardValueInput,
): Promise<GiftCardValueDTO | null> {
  const existing = await prisma.giftCardValue.findUnique({
    where: { cardValueId: id },
  });

  if (!existing) return null;

  const row = await prisma.giftCardValue.update({
    where: { cardValueId: id },
    data,
    include: {
      cardType: { select: { cardTypeName: true } }
    }
  });

  return {
    cardValueId:        row.cardValueId,
    cardTypeId:         row.cardTypeId,
    cardValueAmount:    Number(row.cardValueAmount),
    cardValueCurrency:  row.cardValueCurrency,
    cardValueIsActive:  row.cardValueIsActive,
    cardValueCreatedAt: row.cardValueCreatedAt.toISOString(),
    cardTypeName:       row.cardType.cardTypeName,
  };
}

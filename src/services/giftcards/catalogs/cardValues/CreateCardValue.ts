import { prisma } from '../../../../db/prisma';
import type { GiftCardValueDTO } from '../../../../../shared/dto/GiftCardValue';
import { GiftCardValidationError } from '../../errors';

export interface CreateCardValueInput {
  cardTypeId:         number;
  cardValueAmount:    number;
  cardValueCurrency:  string;
  cardValueCreatedBy: number;
}

export function validateCreateCardValue(
  raw: Record<string, unknown>,
  cardValueCreatedBy: number,
): CreateCardValueInput {
  const { cardTypeId, cardValueAmount, cardValueCurrency } = raw;

  if (typeof cardTypeId !== 'number' || !Number.isInteger(cardTypeId)) {
    throw new GiftCardValidationError('`cardTypeId` is required and must be an integer');
  }
  if (typeof cardValueAmount !== 'number' || cardValueAmount <= 0) {
    throw new GiftCardValidationError('`cardValueAmount` is required and must be a positive number');
  }
  const currency = typeof cardValueCurrency === 'string' && cardValueCurrency.trim() !== ''
    ? cardValueCurrency.trim().toUpperCase()
    : 'USD';

  return { cardTypeId, cardValueAmount, cardValueCurrency: currency, cardValueCreatedBy };
}

export async function createCardValue(data: CreateCardValueInput): Promise<GiftCardValueDTO> {
  const cardType = await prisma.giftCardType.findUnique({
    where: { cardTypeId: data.cardTypeId },
  });

  if (!cardType || !cardType.cardTypeIsActive) {
    throw new GiftCardValidationError('Card type does not exist or is inactive');
  }

  const row = await prisma.giftCardValue.create({
    data: {
      cardTypeId:         data.cardTypeId,
      cardValueAmount:    data.cardValueAmount,
      cardValueCurrency:  data.cardValueCurrency,
      cardValueIsActive:  true,
      cardValueCreatedBy: data.cardValueCreatedBy,
    },
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

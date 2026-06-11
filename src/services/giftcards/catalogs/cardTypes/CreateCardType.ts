import { prisma } from '../../../../db/prisma';
import type { GiftCardTypeDTO } from '../../../../../shared/dto/GiftCardType';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface CreateCardTypeInput {
  cardTypeName:      string;
  cardTypeCreatedBy: number;
}

export function validateCreateCardType(
  raw:               Record<string, unknown>,
  cardTypeCreatedBy: number,
): CreateCardTypeInput {
  const { cardTypeName } = raw;

  if (typeof cardTypeName !== 'string' || cardTypeName.trim() === '') {
    throw new ValidationError('`cardTypeName` is required and must be a non-empty string');
  }

  return {
    cardTypeName:      cardTypeName.trim(),
    cardTypeCreatedBy: cardTypeCreatedBy,
  };
}

export async function createCardType(data: CreateCardTypeInput): Promise<GiftCardTypeDTO> {
  const row = await prisma.giftCardType.create({
    data: {
      cardTypeName:      data.cardTypeName,
      cardTypeCreatedBy: data.cardTypeCreatedBy,
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
}
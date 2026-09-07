import { prisma } from '../../../../db/prisma';
import type { GiftCardTypeDTO } from '../../../../../shared/dto/GiftCardType';
import { GiftCardValidationError } from '../../errors';

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
    throw new GiftCardValidationError('`cardTypeName` is required and must be a non-empty string');
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
      cardTypeCreatedBy: true,
      cardTypeCreatedAt: true,
      createdBy:         { select: { userName: true } },
    },
  });

  return {
    cardTypeId:        row.cardTypeId,
    cardTypeName:      row.cardTypeName,
    cardTypeIsActive:  row.cardTypeIsActive,
    cardTypeCreatedBy: row.cardTypeCreatedBy,
    cardTypeCreatedByUserName: row.createdBy?.userName ?? null,
    cardTypeCreatedAt: row.cardTypeCreatedAt.toISOString(),
  };
}

import { prisma } from '../../../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { GiftCardValueDTO } from '../../../../../shared/dto/GiftCardValue';

const VALUE_INCLUDE = {
  cardType: { select: { cardTypeName: true } }
} as const;

type GiftCardValueRow = Prisma.GiftCardValueGetPayload<{ include: typeof VALUE_INCLUDE }>;

function mapRow(row: GiftCardValueRow): GiftCardValueDTO {
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

export async function getCardValues(): Promise<GiftCardValueDTO[]> {
  const rows = await prisma.giftCardValue.findMany({
    orderBy: { cardValueId: 'asc' },
    include: VALUE_INCLUDE,
  });
  return rows.map(mapRow);
}

export async function getCardValueById(id: number): Promise<GiftCardValueDTO | null> {
  const row = await prisma.giftCardValue.findUnique({
    where:   { cardValueId: id },
    include: VALUE_INCLUDE,
  });
  if (!row) return null;
  return mapRow(row);
}

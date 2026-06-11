import { prisma } from '../../../../db/prisma';
import type { GiftCardValueDTO } from '../../../../../shared/dto/GiftCardValue';

export async function getCardValues(): Promise<GiftCardValueDTO[]> {
  const rows = await prisma.giftCardValue.findMany({
    orderBy: { cardValueId: 'asc' },
    include: {
      cardType: { select: { cardTypeName: true } }
    }
  });
  return rows.map(row => ({
    cardValueId:        row.cardValueId,
    cardValueAmount:    Number(row.cardValueAmount),
    cardValueCurrency:  row.cardValueCurrency,
    cardValueIsActive:  row.cardValueIsActive,
    cardValueCreatedAt: row.cardValueCreatedAt.toISOString(),
    cardTypeName:       row.cardType.cardTypeName,
  }));
}
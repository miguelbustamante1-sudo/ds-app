import { prisma } from '../../../../db/prisma';
import type { GiftCardTypeDTO } from '../../../../../shared/dto/GiftCardType';

const CARD_TYPE_SELECT = {
  cardTypeId:        true,
  cardTypeName:      true,
  cardTypeIsActive:  true,
  cardTypeCreatedAt: true,
};

function mapCardType(r: {
  cardTypeId:        number;
  cardTypeName:      string;
  cardTypeIsActive:  boolean;
  cardTypeCreatedAt: Date;
}): GiftCardTypeDTO {
  return {
    cardTypeId:        r.cardTypeId,
    cardTypeName:      r.cardTypeName,
    cardTypeIsActive:  r.cardTypeIsActive,
    cardTypeCreatedAt: r.cardTypeCreatedAt.toISOString(),
  };
}

export async function getCardTypes(): Promise<GiftCardTypeDTO[]> {
  const rows = await prisma.giftCardType.findMany({
    select:  CARD_TYPE_SELECT,
    orderBy: { cardTypeId: 'asc' },
  });
  return rows.map(mapCardType);
}

export async function getCardTypeById(id: number): Promise<GiftCardTypeDTO | null> {
  const row = await prisma.giftCardType.findUnique({
    where:  { cardTypeId: id },
    select: CARD_TYPE_SELECT,
  });
  if (!row) return null;
  return mapCardType(row);
}
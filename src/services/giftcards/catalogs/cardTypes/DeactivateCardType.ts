import { prisma } from '../../../../db/prisma';
import type { GiftCardTypeDTO } from '../../../../../shared/dto/GiftCardType';

export async function deactivateCardType(id: number): Promise<boolean> {
  try {
    const existing = await prisma.giftCardType.findUnique({
      where:  { cardTypeId: id },
      select: { cardTypeId: true },
    });
    if (!existing) return false;

    await prisma.giftCardType.update({
      where: { cardTypeId: id },
      data:  { cardTypeIsActive: false },
    });
    return true;
  } catch {
    return false;
  }
}

export async function activateCardType(id: number): Promise<GiftCardTypeDTO | null> {
  const existing = await prisma.giftCardType.findUnique({
    where:  { cardTypeId: id },
    select: {
      cardTypeId:        true,
      cardTypeName:      true,
      cardTypeCreatedAt: true,
    },
  });
  if (!existing) return null;

  await prisma.giftCardType.update({
    where: { cardTypeId: id },
    data:  { cardTypeIsActive: true },
  });

  return {
    cardTypeId:        existing.cardTypeId,
    cardTypeName:      existing.cardTypeName,
    cardTypeIsActive:  true,
    cardTypeCreatedAt: existing.cardTypeCreatedAt.toISOString(),
  };
}

import { prisma } from '../../../../db/prisma';
import type { GiftCardValueDTO } from '../../../../../shared/dto/GiftCardValue';
import { getCardValueById } from './GetCardValues';

export async function deactivateCardValue(id: number): Promise<boolean> {
  const existing = await prisma.giftCardValue.findUnique({
    where: { cardValueId: id },
    select: { cardValueId: true },
  });

  if (!existing) return false;

  await prisma.giftCardValue.update({
    where: { cardValueId: id },
    data:  { cardValueIsActive: false },
  });

  return true;
}

export async function activateCardValue(id: number): Promise<GiftCardValueDTO | null> {
  const existing = await prisma.giftCardValue.findUnique({
    where: { cardValueId: id },
    select: { cardValueId: true },
  });

  if (!existing) return null;

  await prisma.giftCardValue.update({
    where: { cardValueId: id },
    data:  { cardValueIsActive: true },
  });

  return getCardValueById(id);
}

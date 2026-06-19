import { prisma } from '../../../../db/prisma';

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

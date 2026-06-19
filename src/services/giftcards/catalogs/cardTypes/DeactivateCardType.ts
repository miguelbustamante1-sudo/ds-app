import { prisma } from '../../../../db/prisma';

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

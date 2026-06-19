import { prisma } from '../../../../db/prisma';

export async function deactivateReason(id: number): Promise<boolean> {
  const existing = await prisma.giftCardReason.findUnique({
    where:  { reasonId: id },
    select: { reasonId: true },
  });
  if (!existing) return false;

  await prisma.giftCardReason.update({
    where: { reasonId: id },
    data:  { reasonIsActive: false },
  });
  return true;
}

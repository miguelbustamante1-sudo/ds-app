import { prisma } from '../../../../db/prisma';

export async function deactivatePool(id: number): Promise<boolean> {
  const existing = await prisma.giftCardPool.findUnique({
    where:  { poolId: id },
    select: { poolId: true },
  });
  if (!existing) return false;

  await prisma.giftCardPool.update({
    where: { poolId: id },
    data:  { poolIsActive: false },
  });
  return true;
}

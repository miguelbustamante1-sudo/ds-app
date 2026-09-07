import { prisma } from '../../../../db/prisma';
import type { GiftCardReasonDTO } from '../../../../../shared/dto/GiftCardReason';

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

export async function activateReason(id: number): Promise<GiftCardReasonDTO | null> {
  const existing = await prisma.giftCardReason.findUnique({
    where:  { reasonId: id },
    select: {
      reasonId:        true,
      reasonName:      true,
      reasonCreatedBy: true,
      reasonCreatedAt: true,
      createdBy:       { select: { userName: true } },
    },
  });
  if (!existing) return null;

  await prisma.giftCardReason.update({
    where: { reasonId: id },
    data:  { reasonIsActive: true },
  });

  return {
    reasonId:        existing.reasonId,
    reasonName:      existing.reasonName,
    reasonIsActive:  true,
    reasonCreatedBy: existing.reasonCreatedBy,
    reasonCreatedByUserName: existing.createdBy?.userName ?? null,
    reasonCreatedAt: existing.reasonCreatedAt.toISOString(),
  };
}

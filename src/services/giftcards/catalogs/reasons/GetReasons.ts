import { prisma } from '../../../../db/prisma';
import type { GiftCardReasonDTO } from '../../../../../shared/dto/GiftCardReason';

const REASON_SELECT = {
  reasonId:        true,
  reasonName:      true,
  reasonIsActive:  true,
  reasonCreatedAt: true,
};

function mapReason(r: {
  reasonId:        number;
  reasonName:      string;
  reasonIsActive:  boolean;
  reasonCreatedAt: Date;
}): GiftCardReasonDTO {
  return {
    reasonId:        r.reasonId,
    reasonName:      r.reasonName,
    reasonIsActive:  r.reasonIsActive,
    reasonCreatedAt: r.reasonCreatedAt.toISOString(),
  };
}

export async function getReasons(): Promise<GiftCardReasonDTO[]> {
  const rows = await prisma.giftCardReason.findMany({
    select:  REASON_SELECT,
    orderBy: { reasonId: 'asc' },
  });
  return rows.map(mapReason);
}

export async function getReasonById(id: number): Promise<GiftCardReasonDTO | null> {
  const row = await prisma.giftCardReason.findUnique({
    where:  { reasonId: id },
    select: REASON_SELECT,
  });
  if (!row) return null;
  return mapReason(row);
}

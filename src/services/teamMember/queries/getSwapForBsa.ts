import { prisma } from '../../../db/prisma';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export async function getSwapForBsa(swapId: number): Promise<HolidaySwapDTO | null> {
  const swap = await prisma.holidaySwap.findUnique({
    where: { holidaySwapId: swapId },
    include: {
      holiday: { select: { holidayName: true } },
      status: { select: { statusName: true } },
    },
  });

  if (!swap) return null;

  return {
    holidaySwapId: swap.holidaySwapId,
    teamMemberId: swap.teamMemberId,
    holidayId: swap.holidayId,
    holidayName: swap.holiday.holidayName,
    originalDate: swap.originalDate,
    replacementDate: swap.replacementDate,
    statusId: swap.statusId,
    statusName: swap.status.statusName,
    active: swap.active,
    createdBy: swap.createdBy,
    createdAt: swap.createdAt,
  };
}

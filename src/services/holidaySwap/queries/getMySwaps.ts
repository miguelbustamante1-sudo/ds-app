import { prisma } from '../../../db/prisma';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export async function getMySwaps(teamMemberId: number): Promise<HolidaySwapDTO[]> {
  const swaps = await prisma.holidaySwap.findMany({
    where: { teamMemberId },
    include: {
      holiday: { select: { holidayName: true } },
      status: { select: { statusName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return swaps.map((s) => ({
    holidaySwapId: s.holidaySwapId,
    teamMemberId: s.teamMemberId,
    holidayId: s.holidayId,
    holidayName: s.holiday.holidayName,
    originalDate: s.originalDate,
    replacementDate: s.replacementDate,
    statusId: s.statusId,
    statusName: s.status.statusName,
    active: s.active,
    createdBy: s.createdBy,
    createdAt: s.createdAt,
  }));
}

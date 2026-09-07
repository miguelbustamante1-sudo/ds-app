import { prisma } from '../../../db/prisma';
import { loadStatusIds } from '../components/LoadStatusIds';
import type { ActiveSwapSummaryDTO } from '@shared/dto/HolidaySwap';

/**
 * Returns only acknowledged (approved) + active swaps for a given teamMemberId.
 * Used by the active-swaps endpoint and backend day calculation.
 */
export async function getActiveSwapsForTM(teamMemberId: number): Promise<ActiveSwapSummaryDTO[]> {
  const statusIds = await loadStatusIds();

  const swaps = await prisma.holidaySwap.findMany({
    where: {
      teamMemberId,
      statusId: statusIds.approved, // "Acknowledged" in the status table
      active: true,
    },
    include: {
      holiday: { select: { holidayName: true } },
    },
    orderBy: { originalDate: 'asc' },
  });

  return swaps.map((s) => ({
    holidaySwapId: s.holidaySwapId,
    holidayId: s.holidayId,
    holidayName: s.holiday.holidayName,
    originalDate: s.originalDate.toISOString(),
    replacementDate: s.replacementDate.toISOString(),
  }));
}

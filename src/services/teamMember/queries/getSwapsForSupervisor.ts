/**
 * Dedicated wrapper for holiday swaps visible to a supervisor.
 * Follows the canonical pattern: calls getReports() then applies its own filtering.
 */

import { prisma } from '../../../db/prisma';
import { getReports } from './getReports';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export async function getSwapsForSupervisor(
  supervisorTeamMemberId: number,
  targetTeamMemberId: number
): Promise<HolidaySwapDTO[]> {
  // 1. Get all team members under this supervisor (direct + indirect)
  const reports = await getReports(supervisorTeamMemberId, true);
  const reportIds = new Set(reports.map((r) => r.teamMemberId));

  // 2. Verify the target is a report of this supervisor
  if (!reportIds.has(targetTeamMemberId)) {
    throw new Error('Access denied: team member is not in your reporting hierarchy.');
  }

  // 3. Query swaps for the target
  const swaps = await prisma.holidaySwap.findMany({
    where: { teamMemberId: targetTeamMemberId },
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

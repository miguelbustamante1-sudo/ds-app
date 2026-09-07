/**
 * Dedicated wrapper for holiday swaps visible to a supervisor.
 * Follows the canonical pattern: calls getReports() then applies its own filtering.
 * When viewAll is true, skips the hierarchy check and allows any active team member.
 */

import { prisma } from '../../../db/prisma';
import { getReports } from './getReports';
import { getAllActiveTeamMembers } from './getAllActiveTeamMembers';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export async function getSwapsForSupervisor(
  supervisorTeamMemberId: number,
  targetTeamMemberId: number,
  viewAll = false,
): Promise<HolidaySwapDTO[]> {
  const reports = viewAll
    ? await getAllActiveTeamMembers()
    : await getReports(supervisorTeamMemberId, true);
  const reportIds = new Set(reports.map((r) => r.teamMemberId));

  if (!reportIds.has(targetTeamMemberId)) {
    throw new Error('Access denied: team member is not in your reporting hierarchy.');
  }

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

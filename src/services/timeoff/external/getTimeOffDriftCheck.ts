import { prisma } from '../../../db/prisma';
import { getTeamMemberByWorkdayId } from '../../../db/teamMembers';
import type { DriftCheckResponseDTO } from '@shared/dto/TimeOffExternalDriftCheck';

// Tentative (1), Acknowledged (2), Taken (3) — statuses that count as "really happening".
const ACTIVE_STATUS_IDS = [1, 2, 3];
// Cancelled (4), Rejected (5), Split (6), InAuth (7).
const INACTIVE_STATUS_IDS = [4, 5, 6, 7];

interface RawTimeOffSnapshot {
  tto_stadat: string;
  tto_enddat: string;
  sta_id: number;
  tto_active: number;
}

interface RawChangeLogRow {
  toc_old_values: RawTimeOffSnapshot;
  toc_new_values: RawTimeOffSnapshot;
  toc_created_at: Date;
}

export async function getTimeOffDriftCheck(workdayId: string, date: Date): Promise<DriftCheckResponseDTO> {
  const teamMember = await getTeamMemberByWorkdayId(workdayId);
  if (!teamMember) {
    return { reason: 'UNKNOWN_WORKDAY_ID' };
  }

  if (teamMember.teamMemberEndDate && teamMember.teamMemberEndDate < date) {
    return {
      reason: 'EMPLOYEE_INACTIVE',
      teamMemberEndDate: teamMember.teamMemberEndDate,
    };
  }

  const currentMatch = await prisma.timeOff.findFirst({
    where: {
      teamMemberId: teamMember.teamMemberId,
      timeOffActive: 1,
      statusId: { in: ACTIVE_STATUS_IDS },
      timeOffStartDate: { lte: date },
      timeOffEndDate: { gte: date },
    },
    include: {
      status: { select: { statusName: true } },
      category: { select: { categoryName: true } },
    },
  });

  if (currentMatch) {
    return {
      reason: 'STILL_VALID',
      startDate: currentMatch.timeOffStartDate,
      endDate: currentMatch.timeOffEndDate,
      status: currentMatch.status?.statusName ?? 'Unknown',
      type: currentMatch.category?.categoryName ?? 'Unknown',
    };
  }

  const changeLogRows = await prisma.$queryRaw<RawChangeLogRow[]>`
    SELECT toc_old_values, toc_new_values, toc_created_at
    FROM ds.toc_timeoff_changelog
    WHERE (toc_old_values ->> 'tms_id')::int = ${teamMember.teamMemberId}
      AND (toc_old_values ->> 'tto_stadat')::date <= ${date}
      AND (toc_old_values ->> 'tto_enddat')::date >= ${date}
    ORDER BY toc_created_at DESC
    LIMIT 1
  `;

  const entry = changeLogRows[0];
  if (!entry) {
    return { reason: 'NO_RECORD_FOUND' };
  }

  const changedDate = entry.toc_created_at;
  const oldValues = entry.toc_old_values;
  const newValues = entry.toc_new_values;

  const oldStart = new Date(oldValues.tto_stadat);
  const oldEnd = new Date(oldValues.tto_enddat);
  const newStart = new Date(newValues.tto_stadat);
  const newEnd = new Date(newValues.tto_enddat);
  const datesChanged = newStart.getTime() !== oldStart.getTime() || newEnd.getTime() !== oldEnd.getTime();
  const stillCoversDate = newStart <= date && newEnd >= date;

  if (datesChanged && !stillCoversDate) {
    return {
      reason: 'DATES_CHANGED',
      oldStartDate: oldStart,
      oldEndDate: oldEnd,
      newStartDate: newStart,
      newEndDate: newEnd,
      changedDate,
    };
  }

  const oldStatusId = Number(oldValues.sta_id);
  const newStatusId = Number(newValues.sta_id);
  if (ACTIVE_STATUS_IDS.includes(oldStatusId) && INACTIVE_STATUS_IDS.includes(newStatusId)) {
    const statusRows = await prisma.timeOffStatus.findMany({
      where: { statusId: { in: [oldStatusId, newStatusId] } },
      select: { statusId: true, statusName: true },
    });
    const statusNameById = new Map(statusRows.map((row) => [row.statusId, row.statusName]));
    return {
      reason: 'STATUS_CHANGED',
      oldStatus: statusNameById.get(oldStatusId) ?? 'Unknown',
      newStatus: statusNameById.get(newStatusId) ?? 'Unknown',
      changedDate,
    };
  }

  const oldActive = Number(oldValues.tto_active);
  const newActive = Number(newValues.tto_active);
  if (oldActive === 1 && newActive === 0) {
    return { reason: 'DELETED', changedDate };
  }

  return { reason: 'NO_RECORD_FOUND' };
}

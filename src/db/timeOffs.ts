import { prisma } from './prisma';
import type { TimeOff } from '@prisma/client';
import type { TimeOffWithDetailsDTO } from '../../shared/dto/TimeOff';

export const TABLE = 'ds.tbl_tms_time_off';

/**
 * Check that the time off table exists (non-destructive)
 */
export async function ensureTimeOffsTableExists(): Promise<boolean> {
  try {
    await prisma.timeOff.findFirst();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all time offs
 */
export async function getAllTimeOffs(): Promise<TimeOff[]> {
  return await prisma.timeOff.findMany({
    orderBy: { timeOffId: 'asc' },
  });
}

/**
 * Get a time off by id
 */
export async function getTimeOffById(id: number): Promise<TimeOff | null> {
  return await prisma.timeOff.findUnique({
    where: { timeOffId: id },
  });
}

/**
 * Get time offs by team member id
 */
export async function getTimeOffsByTeamMemberId(teamMemberId: number): Promise<TimeOff[]> {
  return await prisma.timeOff.findMany({
    where: { teamMemberId },
    orderBy: { timeOffStartDate: 'asc' },
  });
}

/**
 * Create a new time off
 */
export async function createTimeOff(
  teamMemberId: number | null,
  timeOffStartDate: Date | string,
  timeOffEndDate: Date | string,
  timeOffCreatedBy: number | null,
  timeOffCreatedDate: Date | string | null,
  categoryId: number | null,
  statusId: number | null = null,
  timeOffDays: number = 0,
  timeOffOriginalId: number | null = null
): Promise<TimeOff> {
  return await prisma.timeOff.create({
    data: {
      teamMemberId,
      timeOffStartDate: typeof timeOffStartDate === 'string' ? new Date(timeOffStartDate) : timeOffStartDate,
      timeOffEndDate: typeof timeOffEndDate === 'string' ? new Date(timeOffEndDate) : timeOffEndDate,
      timeOffDays,
      timeOffOriginalId,
      timeOffCreatedBy,
      timeOffCreatedDate: timeOffCreatedDate ? (typeof timeOffCreatedDate === 'string' ? new Date(timeOffCreatedDate) : timeOffCreatedDate) : null,
      categoryId,
      statusId,
    },
  });
}

/**
 * Update a time off
 */
export async function updateTimeOff(
  id: number,
  teamMemberId: number | null,
  timeOffStartDate: Date | string,
  timeOffEndDate: Date | string,
  timeOffLastUpdatedBy: number | null,
  timeOffLastUpdatedDate: Date | string | null,
  categoryId: number | null,
  statusId: number | null = null,
  timeOffDays?: number
): Promise<TimeOff | null> {
  return await prisma.timeOff.update({
    where: { timeOffId: id },
    data: {
      teamMemberId,
      timeOffStartDate: typeof timeOffStartDate === 'string' ? new Date(timeOffStartDate) : timeOffStartDate,
      timeOffEndDate: typeof timeOffEndDate === 'string' ? new Date(timeOffEndDate) : timeOffEndDate,
      ...(timeOffDays !== undefined && { timeOffDays }),
      timeOffLastUpdatedBy,
      timeOffLastUpdatedDate: timeOffLastUpdatedDate ? (typeof timeOffLastUpdatedDate === 'string' ? new Date(timeOffLastUpdatedDate) : timeOffLastUpdatedDate) : null,
      categoryId,
      statusId,
    },
  });
}

/**
 * Delete a time off
 */
export async function deleteTimeOff(id: number): Promise<boolean> {
  try {
    await prisma.timeOff.delete({
      where: { timeOffId: id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get time offs for the current user (My Time Offs)
 * Returns past 1 month + all future time offs with category and status details
 */
export async function getMyTimeOffs(teamMemberId: number): Promise<TimeOffWithDetailsDTO[]> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      teamMemberId,
      timeOffActive: 1,
      OR: [
        { timeOffEndDate: { gte: oneMonthAgo } },
      ],
    },
    include: {
      category: { select: { categoryName: true } },
      status: { select: { statusName: true } },
      _count: { select: { changeLogs: true } },
    },
    orderBy: { timeOffStartDate: 'desc' },
  });

  return timeOffs.map((timeOff) => ({
    timeOffId: timeOff.timeOffId,
    timeOffStartDate: timeOff.timeOffStartDate,
    timeOffEndDate: timeOff.timeOffEndDate,
    timeOffDays: Number(timeOff.timeOffDays),
    timeOffOriginalId: timeOff.timeOffOriginalId,
    categoryId: timeOff.categoryId,
    categoryName: timeOff.category?.categoryName ?? 'Unknown',
    statusId: timeOff.statusId,
    statusName: timeOff.status?.statusName ?? 'Unknown',
    changeLogCount: timeOff._count.changeLogs,
  }));
}

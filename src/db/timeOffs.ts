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
  timeOffOriginalId: number | null = null,
  timeOffIsException: boolean = false,
  timeOffPeriod: string | null = null
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
      timeOffIsException,
      timeOffPeriod,
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
  timeOffDays?: number,
  timeOffIsException?: boolean
): Promise<TimeOff | null> {
  return await prisma.timeOff.update({
    where: { timeOffId: id },
    data: {
      teamMemberId,
      timeOffStartDate: typeof timeOffStartDate === 'string' ? new Date(timeOffStartDate) : timeOffStartDate,
      timeOffEndDate: typeof timeOffEndDate === 'string' ? new Date(timeOffEndDate) : timeOffEndDate,
      ...(timeOffDays !== undefined && { timeOffDays }),
      ...(timeOffIsException !== undefined && { timeOffIsException }),
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
 * Returns past 1 month + all records starting in the current year + all future time offs.
 * The current-year window ensures SV vacation day counting is accurate for the full year.
 */
export async function getTimeOffsByTeamMember(teamMemberId: number): Promise<TimeOffWithDetailsDTO[]> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      teamMemberId,
      timeOffActive: 1,
      OR: [
        { timeOffEndDate: { gte: oneMonthAgo } },
        { timeOffStartDate: { gte: startOfYear } },
      ],
    },
    include: {
      teamMember: { select: { countryId: true } },
      category: {
        select: {
          categoryName: true,
          categoryCountries: { select: { categoryCountryDaysBefore: true, countryId: true } },
        },
      },
      status: { select: { statusName: true } },
      _count: { select: { changeLogs: true } },
    },
    orderBy: { timeOffStartDate: 'desc' },
  });

  return timeOffs.map((timeOff) => {
    const countryId = timeOff.teamMember?.countryId ?? null;
    const categoryCountry = timeOff.category?.categoryCountries.find(
      (cc) => cc.countryId === countryId
    );

    return {
      timeOffId: timeOff.timeOffId,
      teamMemberId: timeOff.teamMemberId,
      timeOffStartDate: timeOff.timeOffStartDate,
      timeOffEndDate: timeOff.timeOffEndDate,
      timeOffDays: Number(timeOff.timeOffDays),
      timeOffOriginalId: timeOff.timeOffOriginalId,
      timeOffIsProjected: timeOff.timeOffIsProjected,
      categoryId: timeOff.categoryId,
      categoryName: timeOff.category?.categoryName ?? 'Unknown',
      statusId: timeOff.statusId,
      statusName: timeOff.status?.statusName ?? 'Unknown',
      changeLogCount: timeOff._count.changeLogs,
      categoryCountryDaysBefore: categoryCountry?.categoryCountryDaysBefore ?? 0,
      timeOffPeriod: timeOff.timeOffPeriod,
    };
  });
}

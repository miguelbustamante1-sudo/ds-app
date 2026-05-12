import { prisma } from '../../../db/prisma';
import { getWorkdayInfoById } from '../../../db/workdayInfo';
import { computeAnniversaryWindow } from '../utils/anniversaryYear';

export interface WorkdayBalanceResult {
  vacation: number;
  rawVacation: number;             // Total accrued vacation days from win_vacation (before subtracting used)
  personalDays: number;
  exceptionDaysUsed: number;       // GT only; 0 for all other countries
  exceptionDaysRemaining: number;  // GT only; 5 - used, min 0
}

const REJECTED_STATUS_ID = 5;
const SPLIT_STATUS_ID = 6;
const GT_COUNTRY_ISO = 'GT';
const MAX_EXCEPTION_DAYS = 5;

/**
 * Returns the available balance for a team member.
 * Raw workday values minus all non-cancelled, non-rejected time-off days
 * for the matching category. The win_workday_info table is never mutated.
 *
 * For GT team members, also returns exception day counts scoped to the
 * current anniversary year window.
 */
export async function getWorkdayBalance(teamMemberId: number, excludeTimeOffId?: number): Promise<WorkdayBalanceResult> {
  const member = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: {
      workdayId: true,
      teamMemberStartDate: true,
      country: { select: { countryIso: true } },
    },
  });

  if (!member || !member.workdayId) {
    return { vacation: 0, rawVacation: 0, personalDays: 0, exceptionDaysUsed: 0, exceptionDaysRemaining: MAX_EXCEPTION_DAYS };
  }

  const info = await getWorkdayInfoById(member.workdayId);
  if (!info) {
    return { vacation: 0, rawVacation: 0, personalDays: 0, exceptionDaysUsed: 0, exceptionDaysRemaining: MAX_EXCEPTION_DAYS };
  }

  const rawVacation = info.vacation !== null ? Number(info.vacation) : 0;
  const rawPersonalDays = info.personalDays !== null ? Number(info.personalDays) : 0;

  const { anniversaryYearStart, anniversaryYearEnd } = computeAnniversaryWindow(
    info.hireDate ?? member.teamMemberStartDate
  );

  // Resolve cancelled status ID dynamically
  const cancelledStatus = await prisma.timeOffStatus.findFirst({
    where: { statusName: { equals: 'cancelled', mode: 'insensitive' } },
    select: { statusId: true },
  });
  const cancelledId = cancelledStatus?.statusId;

  const excludedIds = [REJECTED_STATUS_ID, SPLIT_STATUS_ID, ...(cancelledId ? [cancelledId] : [])];

  // Vacation: sum only requests not yet absorbed by Workday (tto_backfilled = 0).
  // The anniversary year window is no longer used for vacation — tto_backfilled is the sole differentiator.
  const pendingVacation = await prisma.timeOff.aggregate({
    where: {
      teamMemberId,
      timeOffBackfilled: 0,
      statusId: { notIn: excludedIds },
      category: { categoryName: { equals: 'Vacation', mode: 'insensitive' } },
      ...(excludeTimeOffId ? { NOT: { timeOffId: excludeTimeOffId } } : {}),
    },
    _sum: { timeOffDays: true },
  });

  const usedVacation = Number(pendingVacation._sum.timeOffDays ?? 0);

  // Personal days: keep anniversary-year-scoped calculation unchanged.
  const personalDayTimeOffs = await prisma.timeOff.findMany({
    where: {
      teamMemberId,
      statusId: { notIn: excludedIds },
      timeOffStartDate: { gte: anniversaryYearStart, lte: anniversaryYearEnd },
      category: { categoryName: { in: ['Personal Day', 'Personal Days'], mode: 'insensitive' } },
      ...(excludeTimeOffId ? { NOT: { timeOffId: excludeTimeOffId } } : {}),
    },
    select: { timeOffDays: true },
  });

  const usedPersonalDays = personalDayTimeOffs.reduce((sum, t) => sum + Number(t.timeOffDays), 0);

  // Exception days — GT only
  const countryIso = member.country?.countryIso?.toUpperCase() ?? null;
  let exceptionDaysUsed = 0;

  if (countryIso === GT_COUNTRY_ISO) {
    const vacationCategory = await prisma.timeOffCategory.findFirst({
      where: { categoryName: { equals: 'Vacation', mode: 'insensitive' } },
      select: { categoryId: true },
    });

    if (vacationCategory) {
      const exceptionTimeOffs = await prisma.timeOff.findMany({
        where: {
          teamMemberId,
          categoryId: vacationCategory.categoryId,
          timeOffActive: 1,
          timeOffIsException: true,
          statusId: { notIn: excludedIds },
          timeOffStartDate: {
            gte: anniversaryYearStart,
            lte: anniversaryYearEnd,
          },
          ...(excludeTimeOffId ? { NOT: { timeOffId: excludeTimeOffId } } : {}),
        },
        select: { timeOffDays: true },
      });

      exceptionDaysUsed = exceptionTimeOffs.reduce(
        (sum, t) => sum + Number(t.timeOffDays),
        0
      );
    }
  }

  return {
    vacation: Math.max(0, rawVacation - usedVacation),
    rawVacation,
    personalDays: Math.max(0, rawPersonalDays - usedPersonalDays),
    exceptionDaysUsed,
    exceptionDaysRemaining: Math.max(0, MAX_EXCEPTION_DAYS - exceptionDaysUsed),
  };
}

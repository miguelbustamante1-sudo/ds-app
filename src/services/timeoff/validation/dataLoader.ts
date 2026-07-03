/**
 * Data Loader for TimeOff Validation
 * NFR-2: Loads all required context in a single place before validation
 */

import { prisma } from '../../../db/prisma';
import type { TimeOffValidationInput, TimeOffValidationContext } from './types';
import { DEFAULTS } from './types';
import type { ElSalvadorVacationContext } from './rules/elSalvadorVacation.rule';
import { getWorkdayBalance } from '../components/GetWorkdayBalance';
import { computeAnniversaryWindow } from '../utils/anniversaryYear';

const CANCELLED_STATUS_NAME = 'cancelled';
const SPLIT_STATUS_ID = 6;

/**
 * Loads all validation context from the database
 * Returns null if team member not found
 */
export async function loadValidationContext(
  input: TimeOffValidationInput
): Promise<TimeOffValidationContext | null> {
  // 1. Load team member with country and end date
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId: input.teamMemberId },
    select: { teamMemberId: true, countryId: true, teamMemberEndDate: true },
  });

  if (!teamMember) return null;

  // 2. Resolve effective country (default to GT = 2 if null)
  const effectiveCountryId = teamMember.countryId ?? DEFAULTS.COUNTRY_ID;

  // 3. Load allowed categories for effective country (include daysBefore for the notice-period rule)
  const allowedCategories = await prisma.categoryCountry.findMany({
    where: {
      countryId: effectiveCountryId,
      categoryCountryStatus: 1,
    },
    select: { categoryId: true, categoryCountryDaysBefore: true, categoryCountryMaxDays: true },
  });
  const allowedCategoryIds = allowedCategories.map((c) => c.categoryId);

  // Resolve categoryCountryDaysBefore for the requested category (0 when not found / not applicable)
  const matchedCategoryCountry = allowedCategories.find((c) => c.categoryId === input.categoryId);
  const categoryCountryDaysBefore = matchedCategoryCountry?.categoryCountryDaysBefore ?? 0;
  const categoryCountryMaxDays = matchedCategoryCountry?.categoryCountryMaxDays ?? 0;

  // Load category name for use in validation error messages
  const categoryRecord = await prisma.timeOffCategory.findUnique({
    where: { categoryId: input.categoryId },
    select: { categoryName: true },
  });
  const categoryName = categoryRecord?.categoryName ?? '';

  // 4. Load blocking status IDs (all except "Cancelled")
  const allStatuses = await prisma.timeOffStatus.findMany({
    select: { statusId: true, statusName: true },
  });
  const blockingStatusIds = allStatuses
    .filter((s) => {
      const name = s.statusName.trim().toLowerCase();
      return name !== CANCELLED_STATUS_NAME && s.statusId !== SPLIT_STATUS_ID;
    })
    .map((s) => s.statusId);

  // 5. Load potential overlapping time offs for same team member
  const overlappingTimeOffs = await prisma.timeOff.findMany({
    where: {
      teamMemberId: input.teamMemberId,
      timeOffActive: 1,
      timeOffStartDate: { lte: input.timeOffEndDate },
      timeOffEndDate: { gte: input.timeOffStartDate },
    },
    select: {
      timeOffId: true,
      timeOffStartDate: true,
      timeOffEndDate: true,
      statusId: true,
    },
  });

  // 6. Load TM's approved holiday swaps (for validation rules)
  const approvedStatus = allStatuses.find((s) => s.statusName.trim().toLowerCase() === 'acknowledged');
  const rawActiveSwaps = approvedStatus
    ? await prisma.holidaySwap.findMany({
        where: {
          teamMemberId: input.teamMemberId,
          active: true,
          statusId: approvedStatus.statusId,
        },
        select: {
          holidaySwapId: true,
          originalDate: true,
          replacementDate: true,
          statusId: true,
          holiday: { select: { holidayName: true } },
        },
      })
    : [];

  const [workdayBalance, rawCountryHolidays] = await Promise.all([
    getWorkdayBalance(input.teamMemberId, input.timeOffId),
    prisma.holiday.findMany({
      where: { countryId: effectiveCountryId, holidayIsActive: true },
      select: { holidayId: true, holidayName: true, holidayDate: true, holidayIsRecurring: true },
    }),
  ]);

  return {
    teamMember,
    effectiveCountryId,
    allowedCategoryIds,
    blockingStatusIds,
    activeSwaps: rawActiveSwaps.map((s) => ({
      holidaySwapId: s.holidaySwapId,
      holidayName: s.holiday.holidayName,
      originalDate: s.originalDate,
      replacementDate: s.replacementDate,
      statusId: s.statusId,
    })),
    countryHolidays: rawCountryHolidays,
    overlappingTimeOffs,
    categoryCountryDaysBefore,
    categoryCountryMaxDays,
    categoryName,
    workdayBalance,
  };
}

const SV_COUNTRY_ISO = 'SV';
const VACATION_CATEGORY_NAME = 'Vacation';

/**
 * Calculates calendar days between two dates (inclusive)
 */
function calculateCalendarDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
  return diffDays;
}

/**
 * Loads El Salvador vacation context for the 7/8/15 day rule validation
 * Returns null if not applicable (not SV country or not Vacation category)
 */
export async function loadElSalvadorVacationContext(
  input: TimeOffValidationInput
): Promise<ElSalvadorVacationContext | null> {
  // 1. Load team member with country ISO, start date, and workday info for accrued vacation
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId: input.teamMemberId },
    select: {
      teamMemberId: true,
      teamMemberStartDate: true,
      workdayId: true,
      country: {
        select: { countryIso: true },
      },
    },
  });

  if (!teamMember) return null;

  const countryIso = teamMember.country?.countryIso?.toUpperCase() ?? null;

  // 2. Load category name
  const category = await prisma.timeOffCategory.findUnique({
    where: { categoryId: input.categoryId },
    select: { categoryName: true },
  });

  const categoryName = category?.categoryName?.trim().toLowerCase() ?? null;

  // 3. Check if this is SV + Vacation
  const isElSalvadorVacation =
    countryIso === SV_COUNTRY_ISO &&
    categoryName === VACATION_CATEGORY_NAME.toLowerCase();

  if (!isElSalvadorVacation) {
    return {
      isElSalvadorVacation: false,
      requestedDays: 0,
      existingVacationDaysThisYear: 0,
      accruedVacationDays: 0,
      currentYear: new Date().getFullYear(),
    };
  }

  // 4. Load accrued vacation days and hireDate from win_workday_info
  let accruedVacationDays = 15; // fallback to legal minimum
  let svHireDate: Date | null = null;
  if (teamMember.workdayId) {
    const workdayInfo = await prisma.workdayInfo.findUnique({
      where: { wdid: teamMember.workdayId },
      select: { vacation: true, hireDate: true },
    });
    if (workdayInfo?.vacation != null) {
      accruedVacationDays = Math.max(15, Number(workdayInfo.vacation));
    }
    svHireDate = workdayInfo?.hireDate ?? null;
  }

  // 5. Calculate requested days from date range
  const requestedDays = calculateCalendarDays(input.timeOffStartDate, input.timeOffEndDate);

  // 6. Get anniversary year boundaries (same logic as Guatemala)
  const { anniversaryYearStart: yearStart, anniversaryYearEnd: yearEnd } =
    computeAnniversaryWindow(svHireDate ?? teamMember.teamMemberStartDate);
  const currentYear = yearStart.getUTCFullYear();

  // 7. Get the Vacation category ID
  const vacationCategory = await prisma.timeOffCategory.findFirst({
    where: {
      categoryName: { equals: VACATION_CATEGORY_NAME, mode: 'insensitive' },
    },
    select: { categoryId: true },
  });

  if (!vacationCategory) {
    return {
      isElSalvadorVacation: true,
      requestedDays,
      existingVacationDaysThisYear: 0,
      accruedVacationDays,
      currentYear,
    };
  }

  // 8. Get cancelled status ID to exclude
  const cancelledStatus = await prisma.timeOffStatus.findFirst({
    where: { statusName: { equals: CANCELLED_STATUS_NAME, mode: 'insensitive' } },
    select: { statusId: true },
  });

  // 9. Query existing vacation time-offs for current year
  // Build AND conditions for exclusions
  const andConditions: object[] = [];
  if (cancelledStatus) {
    andConditions.push({ NOT: { statusId: { in: [cancelledStatus.statusId, SPLIT_STATUS_ID] } } });
  } else {
    andConditions.push({ NOT: { statusId: SPLIT_STATUS_ID } });
  }
  if (input.timeOffId) {
    andConditions.push({ NOT: { timeOffId: input.timeOffId } });
  }

  const existingVacations = await prisma.timeOff.findMany({
    where: {
      teamMemberId: input.teamMemberId,
      categoryId: vacationCategory.categoryId,
      timeOffActive: 1,
      timeOffStartDate: {
        gte: yearStart,
        lte: yearEnd,
      },
      ...(andConditions.length > 0 && { AND: andConditions }),
    },
    select: { timeOffDays: true },
  });

  // 10. Sum existing vacation days
  const existingVacationDaysThisYear = existingVacations.reduce(
    (sum, v) => sum + Number(v.timeOffDays),
    0
  );

  return {
    isElSalvadorVacation: true,
    requestedDays,
    existingVacationDaysThisYear,
    accruedVacationDays,
    currentYear,
  };
}


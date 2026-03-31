/**
 * Data Loader for TimeOff Validation
 * NFR-2: Loads all required context in a single place before validation
 */

import { prisma } from '../../../db/prisma';
import type { TimeOffValidationInput, TimeOffValidationContext } from './types';
import { DEFAULTS } from './types';
import type { ElSalvadorVacationContext } from './rules/elSalvadorVacation.rule';
import type { GuatemalaVacationExceptionContext } from './rules/guatemalaVacationException.rule';
import { getWorkdayBalance } from '../components/GetWorkdayBalance';
import { computeAnniversaryWindow } from '../utils/anniversaryYear';
import { calculateTimeOffDaysForTeamMember } from '../dayCalculation';

const CANCELLED_STATUS_NAME = 'cancelled';

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
    .filter((s) => s.statusName.trim().toLowerCase() !== CANCELLED_STATUS_NAME)
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

  const workdayBalance = await getWorkdayBalance(input.teamMemberId, input.timeOffId);

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
  // 1. Load team member with country ISO
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId: input.teamMemberId },
    select: {
      teamMemberId: true,
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
      currentYear: new Date().getFullYear(),
    };
  }

  // 4. Calculate requested days from date range
  const requestedDays = calculateCalendarDays(input.timeOffStartDate, input.timeOffEndDate);

  // 5. Get current year boundaries
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1); // Jan 1
  const yearEnd = new Date(currentYear, 11, 31); // Dec 31

  // 6. Get the Vacation category ID
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
      currentYear,
    };
  }

  // 7. Get cancelled status ID to exclude
  const cancelledStatus = await prisma.timeOffStatus.findFirst({
    where: { statusName: { equals: CANCELLED_STATUS_NAME, mode: 'insensitive' } },
    select: { statusId: true },
  });

  // 8. Query existing vacation time-offs for current year
  // Build AND conditions for exclusions
  const andConditions: object[] = [];
  if (cancelledStatus) {
    andConditions.push({ NOT: { statusId: cancelledStatus.statusId } });
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

  // 9. Sum existing vacation days
  const existingVacationDaysThisYear = existingVacations.reduce(
    (sum, v) => sum + Number(v.timeOffDays),
    0
  );

  return {
    isElSalvadorVacation: true,
    requestedDays,
    existingVacationDaysThisYear,
    currentYear,
  };
}

const GT_COUNTRY_ISO = 'GT';

/**
 * Loads Guatemala vacation exception context for the < 5 days rule.
 * Returns a context with isGuatemalaVacation: false when not applicable.
 */
export async function loadGuatemalaVacationExceptionContext(
  input: TimeOffValidationInput
): Promise<GuatemalaVacationExceptionContext> {
  const NOT_APPLICABLE: GuatemalaVacationExceptionContext = {
    isGuatemalaVacation: false,
    requestedDays: 0,
    usedExceptionDaysInWindow: 0,
    anniversaryYearStart: new Date(),
    anniversaryYearEnd: new Date(),
  };

  // 1. Load team member with country ISO and start date
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId: input.teamMemberId },
    select: {
      teamMemberStartDate: true,
      country: { select: { countryIso: true } },
    },
  });

  if (!teamMember) return NOT_APPLICABLE;

  const countryIso = teamMember.country?.countryIso?.toUpperCase() ?? null;

  // 2. Load category name
  const category = await prisma.timeOffCategory.findUnique({
    where: { categoryId: input.categoryId },
    select: { categoryName: true },
  });
  const categoryName = category?.categoryName?.trim().toLowerCase() ?? null;

  // 3. Only applies to GT + Vacation
  if (countryIso !== GT_COUNTRY_ISO || categoryName !== VACATION_CATEGORY_NAME.toLowerCase()) {
    return NOT_APPLICABLE;
  }

  // 4. Resolve cancelled and rejected status IDs
  const [cancelledStatus, rejectedStatus] = await Promise.all([
    prisma.timeOffStatus.findFirst({
      where: { statusName: { equals: CANCELLED_STATUS_NAME, mode: 'insensitive' } },
      select: { statusId: true },
    }),
    prisma.timeOffStatus.findFirst({
      where: { statusName: { equals: 'rejected', mode: 'insensitive' } },
      select: { statusId: true },
    }),
  ]);

  const excludedStatusIds = [
    ...(cancelledStatus ? [cancelledStatus.statusId] : []),
    ...(rejectedStatus ? [rejectedStatus.statusId] : []),
  ];

  // 5. Calculate anniversary window
  const { anniversaryYearStart, anniversaryYearEnd } = computeAnniversaryWindow(
    teamMember.teamMemberStartDate
  );

  // 6. Get the vacation category ID
  const vacationCategory = await prisma.timeOffCategory.findFirst({
    where: { categoryName: { equals: VACATION_CATEGORY_NAME, mode: 'insensitive' } },
    select: { categoryId: true },
  });

  if (!vacationCategory) {
    return {
      isGuatemalaVacation: true,
      requestedDays: 0,
      usedExceptionDaysInWindow: 0,
      anniversaryYearStart,
      anniversaryYearEnd,
    };
  }

  // 7. Build exclusion conditions
  const andConditions: object[] = [
    ...(excludedStatusIds.length > 0 ? [{ NOT: { statusId: { in: excludedStatusIds } } }] : []),
    ...(input.timeOffId ? [{ NOT: { timeOffId: input.timeOffId } }] : []),
  ];

  // 8. Query active exception vacation time-offs within the anniversary window
  const existingExceptions = await prisma.timeOff.findMany({
    where: {
      teamMemberId: input.teamMemberId,
      categoryId: vacationCategory.categoryId,
      timeOffActive: 1,
      timeOffIsException: true,
      timeOffStartDate: {
        gte: anniversaryYearStart,
        lte: anniversaryYearEnd,
      },
      ...(andConditions.length > 0 && { AND: andConditions }),
    },
    select: { timeOffDays: true },
  });

  const usedExceptionDaysInWindow = existingExceptions.reduce(
    (sum, t) => sum + Number(t.timeOffDays),
    0
  );

  // 9. Calculate requested workdays
  const { totalDays: requestedDays } = await calculateTimeOffDaysForTeamMember(
    input.teamMemberId,
    input.categoryId,
    input.timeOffStartDate,
    input.timeOffEndDate
  );

  return {
    isGuatemalaVacation: true,
    requestedDays,
    usedExceptionDaysInWindow,
    anniversaryYearStart,
    anniversaryYearEnd,
  };
}

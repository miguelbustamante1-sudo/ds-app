import { prisma } from '../../../db/prisma';
import type { SwapEligibilityResult } from './ValidateSwapEligibility';

const SPLIT_STATUS_ID = 6;

export interface ReplacementDayInput {
  teamMemberId: number;
  countryId: number;
  proposedDate: Date;
  originalHolidayDate: Date;
  existingSwapId?: number;
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function sameMonthDay(a: Date, b: Date): boolean {
  return (
    new Date(a).getUTCMonth() === new Date(b).getUTCMonth() &&
    new Date(a).getUTCDate() === new Date(b).getUTCDate()
  );
}

export async function validateReplacementDay(
  input: ReplacementDayInput
): Promise<SwapEligibilityResult> {
  const { teamMemberId, countryId, proposedDate, originalHolidayDate, existingSwapId } = input;

  const proposed = new Date(proposedDate);
  proposed.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const original = new Date(originalHolidayDate);
  original.setHours(0, 0, 0, 0);

  // 1. Must be a future date
  if (proposed <= today) {
    return {
      valid: false,
      errorCode: 'REPLACEMENT_NOT_FUTURE',
      errorMessage: 'The replacement date must be a future date.',
    };
  }

  // 2. Cannot be the same day as the original holiday
  if (proposed.getTime() === original.getTime()) {
    return {
      valid: false,
      errorCode: 'REPLACEMENT_SAME_AS_ORIGINAL',
      errorMessage: 'The replacement date cannot be the same day as the original holiday.',
    };
  }

  // 3. Not a weekend
  if (isWeekend(proposed)) {
    return {
      valid: false,
      errorCode: 'REPLACEMENT_ON_WEEKEND',
      errorMessage: 'The replacement date cannot fall on a weekend.',
    };
  }

  // 4. Not a country holiday
  const holidays = await prisma.holiday.findMany({
    where: {
      countryId,
      holidayIsActive: true,
    },
    select: { holidayDate: true, holidayIsRecurring: true, holidayName: true },
  });

  for (const h of holidays) {
    const hDate = new Date(h.holidayDate);
    const isBlocked = h.holidayIsRecurring
      ? sameMonthDay(hDate, proposed)
      : hDate.getTime() === proposed.getTime();

    if (isBlocked) {
      return {
        valid: false,
        errorCode: 'REPLACEMENT_IS_HOLIDAY',
        errorMessage: `The replacement date (${h.holidayName}) is a public holiday and cannot be used as a replacement day.`,
      };
    }
  }

  // 5. Not already a replacement date for another active swap of the same TM
  const conflictingSwap = await prisma.holidaySwap.findFirst({
    where: {
      teamMemberId,
      active: true,
      replacementDate: proposed,
      ...(existingSwapId ? { NOT: { holidaySwapId: existingSwapId } } : {}),
    },
  });

  if (conflictingSwap) {
    return {
      valid: false,
      errorCode: 'REPLACEMENT_ALREADY_USED',
      errorMessage: 'This date is already used as a replacement day for another active holiday swap.',
    };
  }

  // 6. Not within an existing active TimeOff request
  const cancelledStatus = await prisma.timeOffStatus.findFirst({
    where: { statusName: { equals: 'Cancelled', mode: 'insensitive' } },
    select: { statusId: true },
  });

  const overlappingTimeOff = await prisma.timeOff.findFirst({
    where: {
      teamMemberId,
      timeOffActive: 1,
      timeOffStartDate: { lte: proposed },
      timeOffEndDate: { gte: proposed },
      ...(cancelledStatus ? { NOT: { statusId: { in: [cancelledStatus.statusId, SPLIT_STATUS_ID] } } } : { NOT: { statusId: SPLIT_STATUS_ID } }),
    },
  });

  if (overlappingTimeOff) {
    return {
      valid: false,
      errorCode: 'REPLACEMENT_IN_TIMEOFF',
      errorMessage: 'The replacement date falls within an existing time off request.',
    };
  }

  return { valid: true };
}

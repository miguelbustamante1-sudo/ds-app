import { prisma } from '../../../db/prisma';

export interface SwapEligibilityInput {
  teamMemberId: number;
  countryId: number;
  holiday: { holidayId: number; countryId: number; holidayDate: Date };
  submissionDate: Date;
}

export interface SwapEligibilityResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export async function validateSwapEligibility(
  input: SwapEligibilityInput
): Promise<SwapEligibilityResult> {
  const { teamMemberId, countryId, holiday, submissionDate } = input;

  // 1. Country match
  if (holiday.countryId !== countryId) {
    return {
      valid: false,
      errorCode: 'HOLIDAY_COUNTRY_MISMATCH',
      errorMessage: 'This holiday does not belong to your country.',
    };
  }

  // 2. Holiday must be in the future
  const holidayDate = new Date(holiday.holidayDate);
  holidayDate.setHours(0, 0, 0, 0);
  const today = new Date(submissionDate);
  today.setHours(0, 0, 0, 0);

  if (holidayDate <= today) {
    return {
      valid: false,
      errorCode: 'HOLIDAY_NOT_IN_FUTURE',
      errorMessage: 'The selected holiday must be a future date.',
    };
  }

  // 3. No existing active swap for this TM + holidayId
  const existingSwap = await prisma.holidaySwap.findFirst({
    where: {
      teamMemberId,
      holidayId: holiday.holidayId,
      active: true,
    },
  });

  if (existingSwap) {
    return {
      valid: false,
      errorCode: 'DUPLICATE_SWAP',
      errorMessage: 'You already have an active holiday swap for this holiday.',
    };
  }

  // 4. No active TimeOff covering the holiday date
  const cancelledStatus = await prisma.timeOffStatus.findFirst({
    where: { statusName: { equals: 'Cancelled', mode: 'insensitive' } },
    select: { statusId: true },
  });

  const overlappingTimeOff = await prisma.timeOff.findFirst({
    where: {
      teamMemberId,
      timeOffActive: 1,
      timeOffStartDate: { lte: holidayDate },
      timeOffEndDate: { gte: holidayDate },
      ...(cancelledStatus ? { NOT: { statusId: cancelledStatus.statusId } } : {}),
    },
  });

  if (overlappingTimeOff) {
    const holidayName = ''; // caller resolves display name separately
    return {
      valid: false,
      errorCode: 'HOLIDAY_COVERED_BY_TIMEOFF',
      errorMessage: `You have an existing time off request that includes this holiday. Please cancel it before requesting a swap.${holidayName}`,
    };
  }

  return { valid: true };
}

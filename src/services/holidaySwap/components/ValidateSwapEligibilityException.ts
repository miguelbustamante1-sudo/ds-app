import { prisma } from '../../../db/prisma';
import type { SwapEligibilityInput, SwapEligibilityResult } from './ValidateSwapEligibility';

export type { SwapEligibilityInput, SwapEligibilityResult };

const SPLIT_STATUS_ID = 6;

export async function validateSwapEligibilityException(
  input: SwapEligibilityInput
): Promise<SwapEligibilityResult> {
  const { teamMemberId, countryId, holiday } = input;

  // 1. Country match
  if (holiday.countryId !== countryId) {
    return {
      valid: false,
      errorCode: 'HOLIDAY_COUNTRY_MISMATCH',
      errorMessage: 'This holiday does not belong to your country.',
    };
  }

  // Step 2 (HOLIDAY_NOT_IN_FUTURE) is intentionally omitted on the exception path.

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
      errorMessage: 'This team member already has an active holiday swap for this holiday.',
    };
  }

  // 4. No active TimeOff covering the holiday date
  const holidayDate = new Date(holiday.holidayDate);
  holidayDate.setHours(0, 0, 0, 0);

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
      ...(cancelledStatus
        ? { NOT: { statusId: { in: [cancelledStatus.statusId, SPLIT_STATUS_ID] } } }
        : { NOT: { statusId: SPLIT_STATUS_ID } }),
    },
  });

  if (overlappingTimeOff) {
    return {
      valid: false,
      errorCode: 'HOLIDAY_COVERED_BY_TIMEOFF',
      errorMessage:
        'This team member has an existing time off request that includes this holiday. Please cancel it before requesting a swap.',
    };
  }

  return { valid: true };
}

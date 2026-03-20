import { prisma } from '../../../db/prisma';
import type { HolidaySwap, Holiday } from '@prisma/client';

export interface CancellationValidationResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  conflictingTimeOffIds?: number[];
}

export async function validateCancellation(
  swap: HolidaySwap & { holiday: Holiday }
): Promise<CancellationValidationResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const originalDate = new Date(swap.originalDate);
  originalDate.setHours(0, 0, 0, 0);
  const replacementDate = new Date(swap.replacementDate);
  replacementDate.setHours(0, 0, 0, 0);

  // 1. Original holiday must still be in the future
  if (originalDate <= today) {
    return {
      valid: false,
      errorCode: 'ORIGINAL_DATE_PASSED',
      errorMessage: 'This swap cannot be cancelled because the original holiday date has already passed.',
    };
  }

  const cancelledStatus = await prisma.timeOffStatus.findFirst({
    where: { statusName: { equals: 'Cancelled', mode: 'insensitive' } },
    select: { statusId: true },
  });

  const excludeCancelled = cancelledStatus
    ? { NOT: { statusId: cancelledStatus.statusId } }
    : {};

  // 2. Any active TimeOff created after swap approval whose range includes replacementDate
  const conflictingOnReplacement = await prisma.timeOff.findMany({
    where: {
      teamMemberId: swap.teamMemberId,
      timeOffActive: 1,
      timeOffStartDate: { lte: replacementDate },
      timeOffEndDate: { gte: replacementDate },
      ...(swap.updatedAt ? { timeOffCreatedDate: { gte: new Date(swap.updatedAt) } } : {}),
      ...excludeCancelled,
    },
    select: { timeOffId: true },
  });

  // 3. Any active TimeOff whose range covers originalDate (was a working day during swap)
  const conflictingOnOriginal = await prisma.timeOff.findMany({
    where: {
      teamMemberId: swap.teamMemberId,
      timeOffActive: 1,
      timeOffStartDate: { lte: originalDate },
      timeOffEndDate: { gte: originalDate },
      ...excludeCancelled,
    },
    select: { timeOffId: true },
  });

  const conflictingIds = [
    ...conflictingOnReplacement.map((t) => t.timeOffId),
    ...conflictingOnOriginal.map((t) => t.timeOffId),
  ];

  if (conflictingIds.length > 0) {
    return {
      valid: false,
      errorCode: 'CANCELLATION_CONFLICTS',
      errorMessage:
        'This swap cannot be cancelled because there are time off requests that conflict with the swap dates. Please resolve those time off requests first.',
      conflictingTimeOffIds: [...new Set(conflictingIds)],
    };
  }

  return { valid: true };
}

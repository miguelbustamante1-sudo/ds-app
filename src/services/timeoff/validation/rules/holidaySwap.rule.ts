import type { TimeOffValidationInput, TimeOffValidationContext, ValidationResult } from '../types';

function isSameDay(a: Date, b: Date): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const d = new Date(date).getTime();
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime();
  return d >= s && d <= e;
}

/**
 * Rule: The swapped holiday's originalDate (a working day while swap is active)
 * must not fall within a new time-off request's date range.
 */
export function validateSwappedHolidayNotInRange(
  input: TimeOffValidationInput,
  context: TimeOffValidationContext
): ValidationResult {
  for (const swap of context.activeSwaps) {
    if (isDateInRange(swap.originalDate, input.timeOffStartDate, input.timeOffEndDate)) {
      const dateStr = new Date(swap.originalDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return {
        valid: false,
        error: {
          code: 'SWAPPED_HOLIDAY_IN_RANGE',
          message: `You have swapped ${swap.holidayName} and must work on ${dateStr}. Please adjust your request dates.`,
          metadata: { holidaySwapId: swap.holidaySwapId, originalDate: swap.originalDate },
        },
      };
    }
  }
  return { valid: true };
}

/**
 * Rule: The swapped replacementDate (a personal holiday) must not fall
 * within a new time-off request's date range.
 */
export function validateReplacementDayNotInRange(
  input: TimeOffValidationInput,
  context: TimeOffValidationContext
): ValidationResult {
  for (const swap of context.activeSwaps) {
    if (isDateInRange(swap.replacementDate, input.timeOffStartDate, input.timeOffEndDate)) {
      const dateStr = new Date(swap.replacementDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return {
        valid: false,
        error: {
          code: 'REPLACEMENT_DAY_IN_RANGE',
          message: `Your replacement day ${dateStr} is a personal holiday and cannot be included in a Time Off request.`,
          metadata: { holidaySwapId: swap.holidaySwapId, replacementDate: swap.replacementDate },
        },
      };
    }
  }
  return { valid: true };
}

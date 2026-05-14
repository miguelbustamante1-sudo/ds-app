import type { TimeOffValidationInput, TimeOffValidationContext, ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

function isSameUTCDay(a: Date, b: Date): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

/**
 * Returns true when a holiday (recurring or not) falls on the given date.
 * Recurring holidays are matched by month+day only (year-agnostic).
 * Non-recurring holidays are matched by exact UTC date.
 */
function holidayMatchesDate(
  holiday: { holidayDate: Date; holidayIsRecurring: boolean | null },
  date: Date,
): boolean {
  const hd = new Date(holiday.holidayDate);
  if (holiday.holidayIsRecurring) {
    return hd.getUTCMonth() === new Date(date).getUTCMonth() &&
           hd.getUTCDate()  === new Date(date).getUTCDate();
  }
  return isSameUTCDay(hd, date);
}

/**
 * Rule: Start date cannot fall on a public holiday.
 *
 * Three cases:
 *  A) Regular holiday (no active swap) → hard block: START_DATE_ON_HOLIDAY
 *  B) Holiday that was swapped away (originalDate) → pass; SWAPPED_HOLIDAY_IN_RANGE handles the work-day conflict separately
 *  C) Replacement day from a swap → hard block: START_DATE_ON_REPLACEMENT_DAY
 *
 * Cases are checked in this priority: C first, then A/B.
 */
export function validateNoHolidayStart(
  input: TimeOffValidationInput,
  context: TimeOffValidationContext,
): ValidationResult {
  const startDate = input.timeOffStartDate;

  // Case C: start date is a replacement day (already a personal holiday — cannot be used as start)
  for (const swap of context.activeSwaps) {
    if (isSameUTCDay(swap.replacementDate, startDate)) {
      return {
        valid: false,
        error: TimeOffValidationErrors.START_DATE_ON_REPLACEMENT_DAY(swap.holidayName, startDate),
      };
    }
  }

  // Cases A and B: check country holidays
  for (const holiday of context.countryHolidays) {
    if (!holidayMatchesDate(holiday, startDate)) continue;

    // Case B: this holiday occurrence was swapped away for this team member → no block
    const swappedAway = context.activeSwaps.some((s) => isSameUTCDay(s.originalDate, startDate));
    if (swappedAway) return { valid: true };

    // Case A: regular holiday → block
    return {
      valid: false,
      error: TimeOffValidationErrors.START_DATE_ON_HOLIDAY(holiday.holidayName, startDate),
    };
  }

  return { valid: true };
}

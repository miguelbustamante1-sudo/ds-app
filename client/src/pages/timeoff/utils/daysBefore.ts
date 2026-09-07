/**
 * Days-Before Notice Period Validation Utility
 * Frontend validation for the minimum advance-notice requirement configured
 * on a CategoryCountry record (categoryCountryDaysBefore).
 *
 * Business Rule:
 * - When categoryCountryDaysBefore > 0, a time-off request must be submitted
 *   at least N calendar days before the start date.
 * - Today counts as day 0, tomorrow as day 1.
 * - Calendar days only (weekends included in the count).
 * - When categoryCountryDaysBefore = 0 the feature is fully disabled.
 */

import { differenceInCalendarDays, addDays, startOfDay, format } from 'date-fns';

export interface DaysBeforeValidationResult {
  valid: boolean;
  errorMessage: string | null;
  earliestValidDate: Date | null;
  daysUntilStart: number;
}

/**
 * Validates whether the selected start date satisfies the minimum
 * advance-notice requirement for the given category.
 *
 * @param startDate - The selected time-off start date
 * @param categoryCountryDaysBefore - Minimum required days in advance (0 = disabled)
 * @param categoryName - Category name used in the error message
 */
export function validateDaysBefore(
  startDate: Date | undefined,
  categoryCountryDaysBefore: number,
  categoryName: string
): DaysBeforeValidationResult {
  if (!startDate || categoryCountryDaysBefore <= 0) {
    return { valid: true, errorMessage: null, earliestValidDate: null, daysUntilStart: 0 };
  }

  const today = startOfDay(new Date());
  const daysUntilStart = differenceInCalendarDays(startOfDay(startDate), today);

  if (daysUntilStart >= categoryCountryDaysBefore) {
    return { valid: true, errorMessage: null, earliestValidDate: null, daysUntilStart };
  }

  const earliestValidDate = addDays(today, categoryCountryDaysBefore);
  const formattedDate = format(earliestValidDate, 'MMMM d, yyyy');

  return {
    valid: false,
    errorMessage: `This request for "${categoryName}" does not meet the ${categoryCountryDaysBefore}-day advance notice policy (earliest valid start date is ${formattedDate}). It will be sent through a workflow for exception authorization, and your comment will be shown to the authorizer.`,
    earliestValidDate,
    daysUntilStart,
  };
}

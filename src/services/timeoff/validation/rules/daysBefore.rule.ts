/**
 * Days-Before Notice Period Validation Rule
 * Enforces the minimum advance-notice requirement configured on a CategoryCountry
 * record (ttc_days_before / categoryCountryDaysBefore).
 *
 * Business Rule:
 * - When categoryCountryDaysBefore > 0, the time-off start date must be at
 *   least N calendar days in the future (today = day 0).
 * - When categoryCountryDaysBefore = 0 the rule is disabled for that category.
 *
 * Note: The backend enforces this for all callers including supervisors.
 * The supervisor bypass (advisory-only) is a UI-only affordance.
 */

import type { TimeOffValidationInput, TimeOffValidationContext, ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function validateDaysBefore(
  input: TimeOffValidationInput,
  context: TimeOffValidationContext
): ValidationResult {
  const { categoryCountryDaysBefore, categoryName } = context;

  if (categoryCountryDaysBefore <= 0) return { valid: true };

  const today = startOfDay(new Date());
  const start = startOfDay(input.timeOffStartDate);
  const daysUntilStart = Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilStart >= categoryCountryDaysBefore) return { valid: true };

  const earliestValidDate = new Date(today);
  earliestValidDate.setDate(today.getDate() + categoryCountryDaysBefore);
  return {
    valid: false,
    error: TimeOffValidationErrors.DAYS_BEFORE_NOTICE_REQUIRED(
      categoryName,
      categoryCountryDaysBefore,
      daysUntilStart,
      earliestValidDate
    ),
  };
}

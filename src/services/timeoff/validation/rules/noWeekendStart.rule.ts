/**
 * No Weekend Start Date Validation
 * Validates that the time off start date does not fall on a Saturday or Sunday
 */

import type { TimeOffValidationInput, ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

export function validateNoWeekendStart(input: TimeOffValidationInput): ValidationResult {
  const start = input.timeOffStartDate;

  // Normalize to date-only (ignore time component)
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const dayOfWeek = startDate.getDay();

  // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      valid: false,
      error: TimeOffValidationErrors.START_DATE_ON_WEEKEND(startDate),
    };
  }

  return { valid: true };
}

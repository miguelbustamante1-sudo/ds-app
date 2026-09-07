/**
 * FR-2: Date Range Validation
 * Validates that start date is less than or equal to end date
 */

import type { TimeOffValidationInput, ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

export function validateDateRange(input: TimeOffValidationInput): ValidationResult {
  const start = input.timeOffStartDate;
  const end = input.timeOffEndDate;

  // Normalize to date-only comparison (ignore time component)
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (startDate > endDate) {
    return {
      valid: false,
      error: TimeOffValidationErrors.INVALID_DATE_RANGE,
    };
  }

  return { valid: true };
}

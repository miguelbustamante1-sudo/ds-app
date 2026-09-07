/**
 * Attrition Date Validation
 * Validates that time off dates do not exceed team member's end date
 */

import type { TimeOffValidationInput, TimeOffValidationContext, ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

/**
 * Normalizes a date to midnight UTC for date-only comparison
 */
function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Validates that neither the start nor end date of a time off request
 * exceeds the team member's attrition date.
 *
 * If teamMemberEndDate is null (no attrition date set), validation is skipped.
 */
export function validateAttritionDate(
  input: TimeOffValidationInput,
  context: TimeOffValidationContext
): ValidationResult {
  const { teamMemberEndDate } = context.teamMember;

  // Skip validation if no attrition date is set
  if (!teamMemberEndDate) {
    return { valid: true };
  }

  const attritionDate = normalizeDate(teamMemberEndDate);
  const startDate = normalizeDate(input.timeOffStartDate);
  const endDate = normalizeDate(input.timeOffEndDate);

  // Check if start date exceeds attrition date
  if (startDate > attritionDate) {
    return {
      valid: false,
      error: TimeOffValidationErrors.EXCEEDS_ATTRITION_DATE(startDate, attritionDate),
    };
  }

  // Check if end date exceeds attrition date
  if (endDate > attritionDate) {
    return {
      valid: false,
      error: TimeOffValidationErrors.EXCEEDS_ATTRITION_DATE(endDate, attritionDate),
    };
  }

  return { valid: true };
}

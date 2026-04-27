import type { TimeOffValidationInput, ValidationError } from './types';
import { loadValidationContext } from './dataLoader';
import { validateRequiredFields } from './rules/requiredFields.rule';
import { validateDateRange } from './rules/dateRange.rule';
import { validateNoWeekendStart } from './rules/noWeekendStart.rule';
import { validateCategoryCountry } from './rules/categoryCountry.rule';
import { validateAttritionDate } from './rules/attritionDate.rule';
import { validateNoOverlap } from './rules/overlapPrevention.rule';
import { TimeOffValidationErrors } from './errors';

export interface ExceptionTimeOffValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a time-off for BSA exception entry.
 * Enforces: required fields, date range, no weekend start, category-country,
 * attrition date, and overlap prevention.
 * Skips: notice period, SV/GT country rules, max days, holiday swap conflicts,
 * and workday balance — these are intentionally bypassed for exception entries.
 */
export async function validateExceptionTimeOff(
  input: TimeOffValidationInput
): Promise<ExceptionTimeOffValidationResponse> {
  const errors: ValidationError[] = [];

  const requiredResult = validateRequiredFields(input);
  if (!requiredResult.valid && requiredResult.error) {
    return { valid: false, errors: [requiredResult.error] };
  }

  const dateResult = validateDateRange(input);
  if (!dateResult.valid && dateResult.error) {
    errors.push(dateResult.error);
  }

  const weekendResult = validateNoWeekendStart(input);
  if (!weekendResult.valid && weekendResult.error) {
    errors.push(weekendResult.error);
  }

  const context = await loadValidationContext(input);
  if (!context) {
    return {
      valid: false,
      errors: [TimeOffValidationErrors.TEAM_MEMBER_NOT_FOUND(input.teamMemberId)],
    };
  }

  const categoryResult = validateCategoryCountry(input, context);
  if (!categoryResult.valid && categoryResult.error) {
    errors.push(categoryResult.error);
  }

  const attritionResult = validateAttritionDate(input, context);
  if (!attritionResult.valid && attritionResult.error) {
    errors.push(attritionResult.error);
  }

  const overlapResult = validateNoOverlap(input, context);
  if (!overlapResult.valid && overlapResult.error) {
    errors.push(overlapResult.error);
  }

  return { valid: errors.length === 0, errors };
}

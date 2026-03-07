/**
 * TimeOff Validation Orchestrator
 * Coordinates all validation rules for TimeOff creation/update
 */

import type { TimeOffValidationInput, ValidationError } from './types';
import { loadValidationContext, loadElSalvadorVacationContext } from './dataLoader';
import { validateRequiredFields } from './rules/requiredFields.rule';
import { validateDateRange } from './rules/dateRange.rule';
import { validateCategoryCountry } from './rules/categoryCountry.rule';
import { validateAttritionDate } from './rules/attritionDate.rule';
import { validateNoOverlap } from './rules/overlapPrevention.rule';
import { validateNoWeekendStart } from './rules/noWeekendStart.rule';
import { validateElSalvadorVacation } from './rules/elSalvadorVacation.rule';
import { validateDaysBefore } from './rules/daysBefore.rule';
import { validateWorkdayBalance } from './rules/workdayBalance.rule';
import { calculateTimeOffDaysForTeamMember } from '../dayCalculation';
import { TimeOffValidationErrors } from './errors';

/**
 * Response from the validation orchestrator
 */
export interface TimeOffValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a TimeOff request
 * Runs all validation rules in sequence and returns aggregated errors
 */
export async function validateTimeOff(
  input: TimeOffValidationInput
): Promise<TimeOffValidationResponse> {
  const errors: ValidationError[] = [];

  // Rule 1: Required fields (no context needed)
  const requiredResult = validateRequiredFields(input);
  if (!requiredResult.valid && requiredResult.error) {
    // Fail fast on missing required fields
    return { valid: false, errors: [requiredResult.error] };
  }

  // Rule 2: Date range (no context needed)
  const dateResult = validateDateRange(input);
  if (!dateResult.valid && dateResult.error) {
    errors.push(dateResult.error);
  }

  // Rule 2b: No weekend start date (no context needed)
  const weekendResult = validateNoWeekendStart(input);
  if (!weekendResult.valid && weekendResult.error) {
    errors.push(weekendResult.error);
  }

  // Load context for remaining rules (NFR-2)
  const context = await loadValidationContext(input);
  if (!context) {
    return {
      valid: false,
      errors: [TimeOffValidationErrors.TEAM_MEMBER_NOT_FOUND(input.teamMemberId)],
    };
  }

  // Rule 3: Category-Country validation
  const categoryResult = validateCategoryCountry(input, context);
  if (!categoryResult.valid && categoryResult.error) {
    errors.push(categoryResult.error);
  }

  // Rule 3b: Days-before notice period
  const daysBeforeResult = validateDaysBefore(input, context);
  if (!daysBeforeResult.valid && daysBeforeResult.error) {
    errors.push(daysBeforeResult.error);
  }

  // Rule 4: Attrition date validation
  const attritionResult = validateAttritionDate(input, context);
  if (!attritionResult.valid && attritionResult.error) {
    errors.push(attritionResult.error);
  }

  // Rule 5: Overlap prevention
  const overlapResult = validateNoOverlap(input, context);
  if (!overlapResult.valid && overlapResult.error) {
    errors.push(overlapResult.error);
  }

  // Rule 6: El Salvador Vacation (7/8/15 day rule)
  const svVacationContext = await loadElSalvadorVacationContext(input);
  const svResult = validateElSalvadorVacation(svVacationContext);
  if (!svResult.valid && svResult.error) {
    errors.push(svResult.error);
  }

  // Rule 7: Workday balance (Vacation / Personal Day only)
  const { totalDays } = await calculateTimeOffDaysForTeamMember(
    input.teamMemberId,
    input.categoryId,
    input.timeOffStartDate,
    input.timeOffEndDate
  );
  const balanceResult = validateWorkdayBalance(context.categoryName, totalDays, context.workdayBalance);
  if (!balanceResult.valid && balanceResult.error) {
    errors.push(balanceResult.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Re-export types for consumers
export type { TimeOffValidationInput, ValidationError } from './types';
export { DEFAULTS } from './types';

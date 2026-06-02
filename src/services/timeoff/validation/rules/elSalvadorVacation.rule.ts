/**
 * El Salvador Vacation Days Validation Rule
 * Validates the 7/8/15 day constraint for SV country + Vacation category
 *
 * Business Rules:
 * - Only applies to "Vacation" category for team members in country "SV"
 * - Valid request amounts: 7, 8, or 15 calendar days only
 * - Complementary constraints based on existing usage:
 *   - 7 days used → Can ONLY request 8 days (to complete 15)
 *   - 8 days used → Can ONLY request 7 days (to complete 15)
 */

import type { ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

export interface ElSalvadorVacationContext {
  isElSalvadorVacation: boolean;
  requestedDays: number;
  existingVacationDaysThisYear: number;
  accruedVacationDays: number;
  currentYear: number;
}

const ALLOWED_DAYS = [7, 8, 15] as const;

export function validateElSalvadorVacation(
  svContext: ElSalvadorVacationContext | null
): ValidationResult {
  // Skip validation if not SV + Vacation
  if (!svContext || !svContext.isElSalvadorVacation) {
    return { valid: true };
  }

  const { requestedDays, existingVacationDaysThisYear } = svContext;

  // Check if requested days is valid (7, 8, or 15)
  if (!ALLOWED_DAYS.includes(requestedDays as 7 | 8 | 15)) {
    return {
      valid: false,
      error: TimeOffValidationErrors.SV_VACATION_INVALID_DAYS(requestedDays),
    };
  }

  // Check complementary constraints based on existing usage
  if (existingVacationDaysThisYear === 7 && requestedDays !== 8) {
    return {
      valid: false,
      error: TimeOffValidationErrors.SV_VACATION_MUST_REQUEST_8(requestedDays),
    };
  }

  if (existingVacationDaysThisYear === 8 && requestedDays !== 7) {
    return {
      valid: false,
      error: TimeOffValidationErrors.SV_VACATION_MUST_REQUEST_7(requestedDays),
    };
  }

  return { valid: true };
}

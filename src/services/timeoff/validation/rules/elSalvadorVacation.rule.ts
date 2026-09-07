/**
 * El Salvador Vacation Days Validation Rule
 * Validates the 7/8/15 day constraint for SV country + Vacation category
 *
 * Business Rules:
 * - Only applies to "Vacation" category for team members in country "SV"
 * - Valid request amounts: 7, 8, or 15 calendar days only
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

  const { requestedDays } = svContext;

  // Check if requested days is valid (7, 8, or 15)
  if (!ALLOWED_DAYS.includes(requestedDays as 7 | 8 | 15)) {
    return {
      valid: false,
      error: TimeOffValidationErrors.SV_VACATION_INVALID_DAYS(requestedDays),
    };
  }

  return { valid: true };
}

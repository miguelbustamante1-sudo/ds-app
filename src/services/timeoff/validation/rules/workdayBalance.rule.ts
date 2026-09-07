/**
 * Workday Balance Validation Rule
 * Blocks a request when requestedDays exceeds the employee's available balance
 * for Vacation or Personal Day categories.
 */

import type { ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

export function validateWorkdayBalance(
  categoryName: string,
  requestedDays: number,
  balance: { vacation: number; personalDays: number }
): ValidationResult {
  const name = categoryName.trim().toLowerCase();

  if (name === 'vacation') {
    if (requestedDays > balance.vacation) {
      return {
        valid: false,
        error: TimeOffValidationErrors.INSUFFICIENT_VACATION_BALANCE(requestedDays, balance.vacation),
      };
    }
    return { valid: true };
  }

  if (name === 'personal day' || name === 'personal days') {
    if (requestedDays > balance.personalDays) {
      return {
        valid: false,
        error: TimeOffValidationErrors.INSUFFICIENT_PERSONAL_DAY_BALANCE(requestedDays, balance.personalDays),
      };
    }
    return { valid: true };
  }

  return { valid: true };
}

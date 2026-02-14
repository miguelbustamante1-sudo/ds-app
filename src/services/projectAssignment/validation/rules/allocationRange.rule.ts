/**
 * Validates that allocation is between 0.01 and 100.00 with max 2 decimal places
 */

import type { ValidationResult } from '../types';
import { AssignmentValidationErrors } from '../errors';

export function validateAllocationRange(allocation: number): ValidationResult {
  if (allocation < 0.01 || allocation > 100.00) {
    return { valid: false, error: AssignmentValidationErrors.INVALID_ALLOCATION(allocation) };
  }

  // Check max 2 decimal places
  const decimalPart = allocation.toString().split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    return { valid: false, error: AssignmentValidationErrors.INVALID_ALLOCATION(allocation) };
  }

  return { valid: true };
}

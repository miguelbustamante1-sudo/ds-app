/**
 * FR-1: Required Fields Validation
 * Validates that all required fields are present
 */

import type { TimeOffValidationInput, ValidationResult } from '../types';
import { TimeOffValidationErrors } from '../errors';

const REQUIRED_FIELDS: (keyof TimeOffValidationInput)[] = [
  'teamMemberId',
  'categoryId',
  'timeOffStartDate',
  'timeOffEndDate',
];

export function validateRequiredFields(input: TimeOffValidationInput): ValidationResult {
  for (const field of REQUIRED_FIELDS) {
    if (input[field] === null || input[field] === undefined) {
      return {
        valid: false,
        error: TimeOffValidationErrors.MISSING_REQUIRED_FIELD(field),
      };
    }
  }

  return { valid: true };
}

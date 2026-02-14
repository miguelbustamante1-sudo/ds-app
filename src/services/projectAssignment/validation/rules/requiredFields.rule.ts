/**
 * Validates that all required fields are present
 */

import type { AssignmentValidationInput, ValidationResult } from '../types';
import { AssignmentValidationErrors } from '../errors';

const REQUIRED_FIELDS: (keyof AssignmentValidationInput)[] = [
  'teamMemberId',
  'projectId',
  'projectAssignmentStartDate',
  'projectAssignmentBillRate',
  'projectAssignmentAllocation',
];

export function validateRequiredFields(input: AssignmentValidationInput): ValidationResult {
  for (const field of REQUIRED_FIELDS) {
    const value = input[field];
    if (value === null || value === undefined || value === '') {
      return { valid: false, error: AssignmentValidationErrors.MISSING_REQUIRED_FIELD(field) };
    }
  }
  return { valid: true };
}

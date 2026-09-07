/**
 * ProjectAssignment validation error codes and factory functions
 */

import type { ValidationError } from './types';

export const AssignmentValidationErrors = {
  MISSING_REQUIRED_FIELD: (field: string): ValidationError => ({
    code: 'MISSING_REQUIRED_FIELD',
    message: `Required field '${field}' is missing or null`,
    metadata: { field },
  }),

  MEMBER_NOT_A_REPORT: (teamMemberId: number): ValidationError => ({
    code: 'MEMBER_NOT_A_REPORT',
    message: 'Team member is not a direct or indirect report of the current supervisor',
    metadata: { teamMemberId },
  }),

  INVALID_ALLOCATION: (allocation: number): ValidationError => ({
    code: 'INVALID_ALLOCATION',
    message: 'Allocation must be between 0.01 and 100.00 with at most 2 decimal places',
    metadata: { allocation },
  }),

  ALLOCATION_EXCEEDS_CAP: (total: number, newAllocation: number, existingSum: number): ValidationError => ({
    code: 'ALLOCATION_EXCEEDS_CAP',
    message: `This assignment would bring the total allocation to ${total}%. Maximum allowed is 100%.`,
    metadata: { total, newAllocation, existingSum },
  }),
} as const;

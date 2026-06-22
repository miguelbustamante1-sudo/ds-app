/**
 * ProjectAssignment Validation Orchestrator
 * Coordinates all validation rules for assignment creation
 */

import type { AssignmentValidationInput, ValidationError } from './types';
import { validateRequiredFields } from './rules/requiredFields.rule';
import { validateAllocationRange } from './rules/allocationRange.rule';
import { validateAllocationCap } from './rules/allocationCap.rule';

export interface AssignmentValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

export async function validateAssignment(
  input: AssignmentValidationInput,
): Promise<AssignmentValidationResponse> {
  const errors: ValidationError[] = [];

  // Rule 1: Required fields (fail fast)
  const requiredResult = validateRequiredFields(input);
  if (!requiredResult.valid && requiredResult.error) {
    return { valid: false, errors: [requiredResult.error] };
  }

  // Rule 2: Allocation range
  const allocationResult = validateAllocationRange(input.projectAssignmentAllocation!);
  if (!allocationResult.valid && allocationResult.error) {
    errors.push(allocationResult.error);
  }

  // Rule 3: Cumulative 100% cap — fail fast so the user sees the cap error clearly
  if (errors.length === 0) {
    const capResult = await validateAllocationCap(
      input.teamMemberId!,
      input.projectAssignmentAllocation!,
      input.projectAssignmentStartDate,
      input.projectAssignmentEndDate,
      input.excludeAssignmentId,
      input.excludeProjectId,
    );
    if (!capResult.valid && capResult.error) {
      return { valid: false, errors: [capResult.error] };
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export type { AssignmentValidationInput, ValidationError } from './types';

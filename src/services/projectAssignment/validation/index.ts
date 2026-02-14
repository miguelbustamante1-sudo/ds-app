/**
 * ProjectAssignment Validation Orchestrator
 * Coordinates all validation rules for assignment creation
 */

import type { AssignmentValidationInput, ValidationError } from './types';
import { validateRequiredFields } from './rules/requiredFields.rule';
import { validateMemberIsReport } from './rules/memberIsReport.rule';
import { validateAllocationRange } from './rules/allocationRange.rule';

export interface AssignmentValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

export async function validateAssignment(
  input: AssignmentValidationInput,
  supervisorTeamMemberId: number
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

  // Rule 3: Member is a report of the supervisor
  const memberResult = await validateMemberIsReport(supervisorTeamMemberId, input.teamMemberId!);
  if (!memberResult.valid && memberResult.error) {
    errors.push(memberResult.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export type { AssignmentValidationInput, ValidationError } from './types';

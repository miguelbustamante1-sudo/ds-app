/**
 * Types and interfaces for ProjectAssignment validation
 */

export interface AssignmentValidationInput {
  teamMemberId: number | null;
  projectId: number | null;
  projectAssignmentStartDate: Date | string;
  projectAssignmentEndDate?: Date | string | null;
  projectAssignmentBillRate: number | null;
  projectAssignmentAllocation: number | null;
}

export interface ValidationResult {
  valid: boolean;
  error?: ValidationError;
}

export interface ValidationError {
  code: string;
  message: string;
  metadata?: Record<string, unknown>;
}

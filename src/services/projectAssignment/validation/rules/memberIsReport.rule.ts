/**
 * Validates that the team member is a report of the current supervisor
 */

import type { ValidationResult } from '../types';
import { AssignmentValidationErrors } from '../errors';
import { verifySupervisorRelationship } from '../../../timeoff/supervisor/queries';

export async function validateMemberIsReport(
  supervisorTeamMemberId: number,
  teamMemberId: number
): Promise<ValidationResult> {
  const isReport = await verifySupervisorRelationship(supervisorTeamMemberId, teamMemberId);
  if (!isReport) {
    return { valid: false, error: AssignmentValidationErrors.MEMBER_NOT_A_REPORT(teamMemberId) };
  }
  return { valid: true };
}

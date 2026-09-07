import { authorizerAssignmentOrchestrator } from '../../authorizerAssignment';
import { NoAuthorizerAssignedError } from '../errors';

/**
 * Resolves a team member's current authorizer from the team-member-domain
 * txa_authorizer_assignment table. otherIncomes never queries that table
 * directly — it only calls this function, which delegates to the
 * authorizerAssignment domain service.
 *
 * Both txa_authorizer_assignment and oin_other_incomes key on Workday ID, so
 * this is a pure passthrough — no team-member lookups needed.
 */
export async function resolveAuthorizer(teamMemberWdid: string): Promise<string> {
  const authorizerWdid = await authorizerAssignmentOrchestrator.getCurrentAuthorizer(teamMemberWdid);
  if (authorizerWdid === null) {
    throw new NoAuthorizerAssignedError(teamMemberWdid);
  }
  return authorizerWdid;
}

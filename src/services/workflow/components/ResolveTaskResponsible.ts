import { prisma } from '../../../db/prisma';
import { resolveFirstSupervisorUserId } from './ResolveFirstSupervisorUserId';
import { getBusinessReferenceSubjectResolver } from './BusinessReferenceSubjectRegistry';
import { getOrgPositionForWorkflow } from '../../teamMember/queries/getOrgPositionForWorkflow';
import { getUsersByRoleName } from '../queries/getUsersByRoleName';

interface ResolveInput {
  witId: string;
  assignmentType: string;
  assignedUserId: number | null;
  // NOTE: despite the name, this holds a role NAME (e.g. 'bsa') — the column is
  // wit_assigned_role_id and Rule 3.2 forbids renaming schema-mirrored fields.
  assignedRoleId: string | null;
  dynamicAssignmentType: string | null;
  ownerUserId: number | null; // win_owner_user_id — used as starting point for DYNAMIC
  businessReferenceType: string | null; // used as starting point for DYNAMIC_TD_HIERARCHY (resolves via the record's own subject, not ownerUserId)
  businessReferenceId: string | null;
  performedBy: string; // req.user.email for audit
}

interface ResolveResult {
  resolvedUserId: number | null;
  noResponsibleFound: boolean;
  /** Populated only for ROLE assignment: every member eligible to act on the task. */
  roleCandidateUserIds: number[];
  /** The role name the candidates were drawn from, or null for non-ROLE assignment. */
  roleName: string | null;
}

/** Result shape for the assignment types that resolve to a single user (or nobody). */
function singleUser(resolvedUserId: number | null, noResponsibleFound: boolean): ResolveResult {
  return { resolvedUserId, noResponsibleFound, roleCandidateUserIds: [], roleName: null };
}

export async function resolveTaskResponsible(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  input: ResolveInput,
): Promise<ResolveResult> {
  const { assignmentType, assignedUserId, assignedRoleId, ownerUserId } = input;

  if (assignmentType === 'USER') {
    return singleUser(assignedUserId, !assignedUserId);
  }

  if (assignmentType === 'ROLE') {
    // Role-based: no single resolved user. Every member of the role becomes a candidate
    // assignee (fan-out) and the first to act resolves the task for all of them.
    if (!assignedRoleId) {
      return singleUser(null, true);
    }

    const candidates = await getUsersByRoleName(assignedRoleId);

    return {
      resolvedUserId: null,
      noResponsibleFound: candidates.length === 0,
      roleCandidateUserIds: candidates,
      roleName: assignedRoleId,
    };
  }

  if (assignmentType === 'DYNAMIC') {
    // MANAGER / FIRST_SUPERVISOR: resolve from workflow owner's own supervisor
    if (!ownerUserId) return singleUser(null, true);

    const resolvedUserId = await resolveFirstSupervisorUserId(tx, ownerUserId);
    return singleUser(resolvedUserId, resolvedUserId === null);
  }

  if (assignmentType === 'DYNAMIC_TD_HIERARCHY') {
    // Resolves an org position (Team Leader / OM / AGM) above the business
    // record's own subject via ds.hbt_hierarchy_by_teammember — not the
    // workflow's ownerUserId, since the owner (whoever started the instance)
    // and the record's subject can be different people.
    const { businessReferenceType, businessReferenceId, dynamicAssignmentType } = input;

    if (!businessReferenceType || !businessReferenceId) {
      return singleUser(null, true);
    }

    if (
      dynamicAssignmentType !== 'TEAM_LEADER' &&
      dynamicAssignmentType !== 'OM' &&
      dynamicAssignmentType !== 'AGM'
    ) {
      return singleUser(null, true);
    }

    const subjectResolver = getBusinessReferenceSubjectResolver(businessReferenceType);
    const subjectTeamMemberId = subjectResolver ? await subjectResolver(businessReferenceId) : null;
    if (subjectTeamMemberId === null) {
      return singleUser(null, true);
    }

    const positionTeamMemberId = await getOrgPositionForWorkflow(subjectTeamMemberId, dynamicAssignmentType);
    if (positionTeamMemberId === null) {
      return singleUser(null, true);
    }

    const positionUser = await tx.user.findFirst({ where: { teamMemberId: positionTeamMemberId } });
    return singleUser(positionUser?.userId ?? null, !positionUser);
  }

  return singleUser(null, true);
}

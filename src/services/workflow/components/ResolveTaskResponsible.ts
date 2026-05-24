import { prisma } from '../../../db/prisma';
import { getReportsForWorkflow } from '../../teamMember/queries/getReportsForWorkflow';

interface ResolveInput {
  witId: string;
  assignmentType: string;
  assignedUserId: string | null;
  assignedRoleId: string | null;
  dynamicAssignmentType: string | null;
  ownerUserId: string | null; // win_owner_user_id — used as starting point for DYNAMIC
  performedBy: string; // req.user.email for audit
}

interface ResolveResult {
  resolvedUserId: string | null;
  noResponsibleFound: boolean;
}

export async function resolveTaskResponsible(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  input: ResolveInput,
): Promise<ResolveResult> {
  const { assignmentType, assignedUserId, ownerUserId } = input;

  if (assignmentType === 'USER') {
    return { resolvedUserId: assignedUserId, noResponsibleFound: !assignedUserId };
  }

  if (assignmentType === 'ROLE') {
    // Role-based: no resolved user; task is claimed by any member of the role
    return { resolvedUserId: null, noResponsibleFound: false };
  }

  if (assignmentType === 'DYNAMIC') {
    // MANAGER / FIRST_SUPERVISOR: resolve from workflow owner's manager
    if (!ownerUserId) return { resolvedUserId: null, noResponsibleFound: true };

    // ownerUserId references ds.tbl_users.usr_id — look up teamMemberId
    const dsUser = await tx.user.findUnique({ where: { userId: parseInt(ownerUserId, 10) } });
    if (!dsUser?.teamMemberId) return { resolvedUserId: null, noResponsibleFound: true };

    const supervisorIds = await getReportsForWorkflow(dsUser.teamMemberId);
    const firstSupervisorTmsId = supervisorIds[0];

    if (firstSupervisorTmsId === undefined) return { resolvedUserId: null, noResponsibleFound: true };

    // Resolve back to a usr_id
    const managerUser = await tx.user.findFirst({ where: { teamMemberId: firstSupervisorTmsId } });
    if (!managerUser) return { resolvedUserId: null, noResponsibleFound: true };

    return { resolvedUserId: managerUser.userId.toString(), noResponsibleFound: false };
  }

  return { resolvedUserId: null, noResponsibleFound: true };
}

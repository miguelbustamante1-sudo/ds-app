import { Prisma } from '@prisma/client';
import { getFirstSupervisorForWorkflow } from '../../teamMember/queries/getFirstSupervisorForWorkflow';

/**
 * Resolves a workflow owner's (usr_id) own direct supervisor, as a usr_id.
 * Returns null if the owner has no linked team member or no active
 * supervisor assignment.
 */
export async function resolveFirstSupervisorUserId(
  tx: Prisma.TransactionClient,
  ownerUserId: number,
): Promise<number | null> {
  const dsUser = await tx.user.findUnique({ where: { userId: ownerUserId } });
  if (!dsUser?.teamMemberId) return null;

  const supervisorTmsId = await getFirstSupervisorForWorkflow(dsUser.teamMemberId);
  if (supervisorTmsId === null) return null;

  const supervisorUser = await tx.user.findFirst({ where: { teamMemberId: supervisorTmsId } });
  return supervisorUser?.userId ?? null;
}

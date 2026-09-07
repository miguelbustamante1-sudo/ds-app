import { prisma } from '../../../db/prisma';

/**
 * Resolves a workflow role name to the ds-app user IDs (ds.tbl_users.usr_id) of its members.
 *
 * Roles are stored as a text[] of names on sec.auth_users.roles — values like 'admin' or 'bsa'.
 * That table is deliberately separate from ds.tbl_users (see src/db/authUsers.ts), while workflow
 * tasks reference tbl_users.usr_id, so membership has to hop across the shared email address.
 *
 * Users whose usr_enddat has passed are excluded — a departed employee must never be handed a
 * live workflow task.
 */
export async function getUsersByRoleName(roleName: string): Promise<number[]> {
  const authUsers = await prisma.authUser.findMany({
    where: { roles: { has: roleName } },
    select: { email: true },
  });

  if (authUsers.length === 0) {
    return [];
  }

  const dsUsers = await prisma.user.findMany({
    where: {
      userEmail: { in: authUsers.map((authUser) => authUser.email) },
      OR: [{ userEndDate: null }, { userEndDate: { gt: new Date() } }],
    },
    select: { userId: true },
  });

  return dsUsers.map((dsUser) => dsUser.userId);
}

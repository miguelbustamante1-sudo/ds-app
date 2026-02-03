import { prisma } from './prisma';

export interface RbacPermissionRow {
  permissionResource: string;
  permissionRead: boolean;
  permissionWrite: boolean;
  permissionDelete: boolean;
}

export async function getRbacPermissionsByUserId(userId: number): Promise<RbacPermissionRow[]> {
  // Get all role IDs for the user
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true },
  });

  const roleIds = userRoles.map((ur) => ur.roleId);

  // Get all permissions directly linked to those roles
  const permissions = await prisma.permission.findMany({
    where: { roleId: { in: roleIds } },
    include: { option: true },
  });

  // Transform results - use option.optionDescription or fall back to permissionResource
  return permissions.map((p) => ({
    permissionResource: p.option?.optionDescription ?? p.permissionResource ?? '',
    permissionRead: p.permissionRead,
    permissionWrite: p.permissionWrite,
    permissionDelete: p.permissionDelete,
  }));
}

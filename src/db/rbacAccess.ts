import { prisma } from './prisma';

export interface RbacPermissionRow {
  permissionResource: string;
  permissionRead: boolean;
  permissionWrite: boolean;
  permissionDelete: boolean;
}

export async function getRbacPermissionsByUserId(userId: number): Promise<RbacPermissionRow[]> {
  const results = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  // Flatten and transform the results
  const permissions: RbacPermissionRow[] = [];
  for (const userRole of results) {
    for (const rolePermission of userRole.role.rolePermissions) {
      permissions.push({
        permissionResource: rolePermission.permission.permissionResource,
        permissionRead: rolePermission.permission.permissionRead,
        permissionWrite: rolePermission.permission.permissionWrite,
        permissionDelete: rolePermission.permission.permissionDelete,
      });
    }
  }

  return permissions;
}

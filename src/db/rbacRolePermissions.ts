import { prisma } from './prisma';
import type { RolePermission } from '@prisma/client';

export const TABLE = 'sec.rop_role_permissions';

export async function getAllRbacRolePermissions(): Promise<RolePermission[]> {
  return await prisma.rolePermission.findMany({
    orderBy: [{ roleId: 'asc' }, { permissionId: 'asc' }],
  });
}

export async function getRbacRolePermissionsByRole(roleId: number): Promise<RolePermission[]> {
  return await prisma.rolePermission.findMany({
    where: { roleId },
    orderBy: { permissionId: 'asc' },
  });
}

export async function getRbacRolePermissionsByPermission(permissionId: number): Promise<RolePermission[]> {
  return await prisma.rolePermission.findMany({
    where: { permissionId },
    orderBy: { roleId: 'asc' },
  });
}

export async function createRbacRolePermission(roleId: number, permissionId: number): Promise<RolePermission> {
  return await prisma.rolePermission.create({
    data: {
      roleId,
      permissionId,
    },
  });
}

export async function deleteRbacRolePermission(roleId: number, permissionId: number): Promise<void> {
  await prisma.rolePermission.delete({
    where: {
      roleId_permissionId: {
        roleId,
        permissionId,
      },
    },
  });
}

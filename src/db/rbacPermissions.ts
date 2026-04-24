import { prisma } from './prisma';
import type { Permission, Option } from '@prisma/client';

export const TABLE = 'sec.per_permissions';

export type PermissionWithOption = Permission & { option: Option | null };

export async function getAllRbacPermissions(): Promise<PermissionWithOption[]> {
  return await prisma.permission.findMany({
    orderBy: { permissionId: 'asc' },
    include: { option: true },
  });
}

export async function getRbacPermissionById(id: number): Promise<PermissionWithOption | null> {
  return await prisma.permission.findUnique({
    where: { permissionId: id },
    include: { option: true },
  });
}

export async function getRbacPermissionsByRole(roleId: number): Promise<PermissionWithOption[]> {
  return await prisma.permission.findMany({
    where: { roleId },
    orderBy: { permissionId: 'asc' },
    include: { option: true },
  });
}

export async function createRbacPermission(
  permissionResource: string | null,
  permissionRead: boolean,
  permissionWrite: boolean,
  permissionDelete: boolean,
  permissionDescription: string | null,
  optionId: number | null,
  roleId: number | null
): Promise<Permission> {
  return await prisma.permission.create({
    data: {
      permissionResource,
      permissionRead,
      permissionWrite,
      permissionDelete,
      permissionDescription,
      optionId,
      roleId,
    },
  });
}

export async function updateRbacPermission(
  id: number,
  permissionResource: string | null | undefined,
  permissionRead: boolean,
  permissionWrite: boolean,
  permissionDelete: boolean,
  permissionDescription: string | null | undefined,
  optionId: number | null | undefined,
  roleId: number | null | undefined
): Promise<Permission | null> {
  return await prisma.permission.update({
    where: { permissionId: id },
    data: {
      ...(permissionResource !== undefined && { permissionResource }),
      permissionRead,
      permissionWrite,
      permissionDelete,
      ...(permissionDescription !== undefined && { permissionDescription }),
      ...(optionId !== undefined && { optionId }),
      ...(roleId !== undefined && { roleId }),
      updatedAt: new Date(),
    },
  });
}

export async function deleteRbacPermission(id: number): Promise<void> {
  await prisma.permission.delete({
    where: { permissionId: id },
  });
}

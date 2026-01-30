import { prisma } from './prisma';
import type { Permission } from '@prisma/client';

export const TABLE = 'sec.per_permissions';

export async function getAllRbacPermissions(): Promise<Permission[]> {
  return await prisma.permission.findMany({
    orderBy: { permissionId: 'asc' },
  });
}

export async function getRbacPermissionById(id: number): Promise<Permission | null> {
  return await prisma.permission.findUnique({
    where: { permissionId: id },
  });
}

export async function createRbacPermission(
  permissionResource: string,
  permissionRead: boolean,
  permissionWrite: boolean,
  permissionDelete: boolean,
  permissionDescription: string | null
): Promise<Permission> {
  return await prisma.permission.create({
    data: {
      permissionResource,
      permissionRead,
      permissionWrite,
      permissionDelete,
      permissionDescription,
    },
  });
}

export async function updateRbacPermission(
  id: number,
  permissionResource: string,
  permissionRead: boolean,
  permissionWrite: boolean,
  permissionDelete: boolean,
  permissionDescription: string | null
): Promise<Permission | null> {
  return await prisma.permission.update({
    where: { permissionId: id },
    data: {
      permissionResource,
      permissionRead,
      permissionWrite,
      permissionDelete,
      permissionDescription,
      updatedAt: new Date(),
    },
  });
}

export async function deleteRbacPermission(id: number): Promise<void> {
  await prisma.permission.delete({
    where: { permissionId: id },
  });
}

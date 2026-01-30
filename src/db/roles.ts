import { prisma } from './prisma';
import type { Role } from '@prisma/client';

export const TABLE = 'ds.tbl_roles';

/**
 * Check that the roles table exists (non-destructive)
 */
export async function ensureRolesTableExists(): Promise<boolean> {
  try {
    await prisma.role.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllRoles(): Promise<Role[]> {
  return await prisma.role.findMany({
    orderBy: { roleId: 'asc' },
  });
}

export async function getRoleById(id: number): Promise<Role | null> {
  return await prisma.role.findUnique({
    where: { roleId: id },
  });
}

export async function createRole(roleName: string, roleDescription: string | null): Promise<Role> {
  return await prisma.role.create({
    data: {
      roleName,
      roleDescription,
    },
  });
}

export async function updateRole(id: number, roleName: string, roleDescription: string | null): Promise<Role | null> {
  return await prisma.role.update({
    where: { roleId: id },
    data: {
      roleName,
      roleDescription,
    },
  });
}

export async function deleteRole(id: number): Promise<void> {
  await prisma.role.delete({
    where: { roleId: id },
  });
}

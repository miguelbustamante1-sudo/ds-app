import { prisma } from './prisma';
import type { SecurityRole } from '@prisma/client';

export const TABLE = 'sec.rol_roles';

export async function getAllRbacRoles(): Promise<SecurityRole[]> {
  return await prisma.securityRole.findMany({
    orderBy: { roleId: 'asc' },
  });
}

export async function getRbacRoleById(id: number): Promise<SecurityRole | null> {
  return await prisma.securityRole.findUnique({
    where: { roleId: id },
  });
}

export async function createRbacRole(roleName: string, roleDescription: string | null): Promise<SecurityRole> {
  return await prisma.securityRole.create({
    data: {
      roleName,
      roleDescription,
    },
  });
}

export async function updateRbacRole(
  id: number,
  roleName: string,
  roleDescription: string | null
): Promise<SecurityRole | null> {
  return await prisma.securityRole.update({
    where: { roleId: id },
    data: {
      roleName,
      roleDescription,
    },
  });
}

export async function deleteRbacRole(id: number): Promise<void> {
  await prisma.securityRole.delete({
    where: { roleId: id },
  });
}

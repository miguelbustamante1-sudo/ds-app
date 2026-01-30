import { prisma } from './prisma';
import type { UserRole } from '@prisma/client';

export const TABLE = 'sec.uro_user_roles';

export async function getAllRbacUserRoles(): Promise<UserRole[]> {
  return await prisma.userRole.findMany({
    orderBy: [{ userId: 'asc' }, { roleId: 'asc' }],
  });
}

export async function getRbacUserRolesByUser(userId: number): Promise<UserRole[]> {
  return await prisma.userRole.findMany({
    where: { userId },
    orderBy: { roleId: 'asc' },
  });
}

export async function getRbacUserRolesByRole(roleId: number): Promise<UserRole[]> {
  return await prisma.userRole.findMany({
    where: { roleId },
    orderBy: { userId: 'asc' },
  });
}

export async function createRbacUserRole(userId: number, roleId: number): Promise<UserRole> {
  return await prisma.userRole.create({
    data: {
      userId,
      roleId,
    },
  });
}

export async function deleteRbacUserRole(userId: number, roleId: number): Promise<void> {
  await prisma.userRole.delete({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
  });
}

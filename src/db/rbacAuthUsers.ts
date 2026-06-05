import { prisma } from './prisma';
import type { AuthUserWithRolesDTO } from '@shared/dto';

export async function getAllAuthUsersWithRoles(): Promise<AuthUserWithRolesDTO[]> {
  const [authUsers, userRoles] = await Promise.all([
    prisma.authUser.findMany({ orderBy: { email: 'asc' } }),
    prisma.userRole.findMany({ include: { role: true } }),
  ]);

  const rolesByUserId = new Map<number, typeof userRoles>();
  for (const ur of userRoles) {
    const existing = rolesByUserId.get(ur.userId) ?? [];
    existing.push(ur);
    rolesByUserId.set(ur.userId, existing);
  }

  return authUsers.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
    assignedRoles: (rolesByUserId.get(u.id) ?? []).map((ur) => ({
      roleId: ur.role.roleId,
      roleName: ur.role.roleName,
      roleDescription: ur.role.roleDescription ?? null,
      createdAt: ur.role.createdAt ?? null,
    })),
  }));
}

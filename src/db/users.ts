import { prisma } from './prisma';
import type { User } from '@prisma/client';

export const TABLE = 'ds.tbl_users';

/**
 * Check that the users table exists (non-destructive)
 */
export async function ensureUsersTableExists(): Promise<boolean> {
  try {
    await prisma.user.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllUsers(): Promise<User[]> {
  return await prisma.user.findMany({
    orderBy: { userId: 'asc' },
  });
}

export async function getUserById(id: number): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { userId: id },
  });
}

export async function createUser(
  userName: string,
  userEmail: string,
  userRole: string,
  userStartDate: Date | string,
  userEndDate: Date | string | null,
  teamMemberId: number | null = null
): Promise<User> {
  return await prisma.user.create({
    data: {
      userName,
      userEmail,
      userRole,
      userStartDate: typeof userStartDate === 'string' ? new Date(userStartDate) : userStartDate,
      userEndDate: userEndDate ? (typeof userEndDate === 'string' ? new Date(userEndDate) : userEndDate) : null,
      teamMemberId,
    },
  });
}

export async function updateUser(
  id: number,
  userName: string,
  userEmail: string,
  userRole: string,
  userStartDate: Date | string,
  userEndDate: Date | string | null,
  teamMemberId: number | null = null
): Promise<User | null> {
  return await prisma.user.update({
    where: { userId: id },
    data: {
      userName,
      userEmail,
      userRole,
      userStartDate: typeof userStartDate === 'string' ? new Date(userStartDate) : userStartDate,
      userEndDate: userEndDate ? (typeof userEndDate === 'string' ? new Date(userEndDate) : userEndDate) : null,
      teamMemberId,
    },
  });
}

export async function deleteUser(id: number): Promise<void> {
  await prisma.user.delete({
    where: { userId: id },
  });
}

/**
 * Get both dsUserId and teamMemberId from authenticated user's email in a single query.
 * Used by authMiddleware to resolve ds fields once at auth time.
 */
export async function getDsUserByEmail(email: string): Promise<{ userId: number; teamMemberId: number | null } | null> {
  return prisma.user.findUnique({
    where: { userEmail: email },
    select: { userId: true, teamMemberId: true },
  });
}

/**
 * Response type for getMyTeamMemberProfile
 */
export interface MyTeamMemberProfile {
  teamMemberId: number;
  teamMemberEndDate: Date | null;
  countryId: number | null;
  countryIso: string | null;
}

/**
 * Get current user's team member profile including end date
 * Used for self-service forms that need attrition date validation
 */
export async function getMyTeamMemberProfile(teamMemberId: number): Promise<MyTeamMemberProfile | null> {
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: {
      teamMemberId: true,
      teamMemberEndDate: true,
      countryId: true,
      country: {
        select: {
          countryIso: true,
        },
      },
    },
  });

  return teamMember
    ? {
        teamMemberId: teamMember.teamMemberId,
        teamMemberEndDate: teamMember.teamMemberEndDate,
        countryId: teamMember.countryId,
        countryIso: teamMember.country?.countryIso ?? null,
      }
    : null;
}

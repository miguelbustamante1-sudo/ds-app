import { prisma } from './prisma';
import type { AuthUser } from '@prisma/client';

/**
 * Authentication User Queries
 * Database operations for OneLogin users
 * Note: This is separate from the existing ds.tbl_users table
 */
class AuthUserQueries {
  /**
   * Get user by OneLogin ID (sub claim)
   */
  async getUserByOneLoginId(oneloginId: string): Promise<AuthUser | null> {
    return await prisma.authUser.findUnique({
      where: { oneloginId },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<AuthUser | null> {
    return await prisma.authUser.findUnique({
      where: { id },
    });
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    return await prisma.authUser.findUnique({
      where: { email },
    });
  }

  /**
   * Create new user from OneLogin token
   */
  async createUser(userData: {
    oneloginId: string;
    email: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    avatarUrl?: string | undefined;
    roles?: string[] | undefined;
  }): Promise<AuthUser> {
    return await prisma.authUser.create({
      data: {
        oneloginId: userData.oneloginId,
        email: userData.email,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        avatarUrl: userData.avatarUrl || null,
        roles: userData.roles || ['user'],
      },
    });
  }

  /**
   * Update user roles (admin operation)
   */
  async updateUserRoles(id: number, roles: string[]): Promise<AuthUser> {
    return await prisma.authUser.update({
      where: { id },
      data: {
        roles,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: number): Promise<void> {
    await prisma.authUser.update({
      where: { id },
      data: {
        lastLogin: new Date(),
      },
    });
  }

  /**
   * Link existing user to OneLogin ID (when user exists by email but not by oneloginId)
   */
  async linkOneLoginId(id: number, oneloginId: string): Promise<AuthUser> {
    return await prisma.authUser.update({
      where: { id },
      data: {
        oneloginId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get all users (admin operation)
   */
  async getAllUsers(): Promise<AuthUser[]> {
    return await prisma.authUser.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new AuthUserQueries();

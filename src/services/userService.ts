import { TokenPayload } from './types';
import { GoogleIdTokenPayload } from './googleOidcService';
import { IapJwtPayload } from './iapJwtService';
import authUserDb from '../db/authUsers';

// Using AuthUser from Prisma
import type { AuthUser } from '@prisma/client';

/*
export interface AuthUser {
  id: number;
  oneloginId: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  roles: string[];
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

/**
 * User Service
 * Business logic for user authentication and authorization
 */
class UserService {
  /**
   * Find or create user from OneLogin token
   * Automatically syncs user info from token on login
   */
  async syncUserFromToken(payload: TokenPayload): Promise<AuthUser> {
    try {
      // Check if user exists by OneLogin ID
      let user = await authUserDb.getUserByOneLoginId(payload.sub);

      if (user) {
        // Update last login
        await authUserDb.updateLastLogin(user.id);
        return user;
      }

      // Check if user exists by email (might have been created via Google IAP)
      if (payload.email) {
        user = await authUserDb.getUserByEmail(payload.email);
        if (user) {
          // Link the OneLogin ID to existing user
          await authUserDb.linkOneLoginId(user.id, payload.sub);
          await authUserDb.updateLastLogin(user.id);
          console.log(`Linked OneLogin ID to existing user: ${user.email}`);
          return user;
        }
      }

      // Create new user with default role
      const newUser = await authUserDb.createUser({
        oneloginId: payload.sub,
        email: payload.email,
        firstName: payload.name?.split(' ')[0] || '',
        lastName: payload.name?.split(' ')[1] || '',
        avatarUrl: payload.picture || undefined,
        roles: ['user'], // Default role
      });

      console.log(`New user created from OneLogin: ${newUser.email}`);
      return newUser;
    } catch (error) {
      console.error('Error syncing user from token:', error);
      throw error;
    }
  }

  /**
   * Find or create user from Google ID token
   * Uses sub as the external identifier
   */
  async syncUserFromGoogleToken(payload: GoogleIdTokenPayload): Promise<AuthUser> {
    try {
      if (!payload.sub) {
        throw new Error('Missing Google token subject');
      }

      let user = await authUserDb.getUserByOneLoginId(payload.sub);

      if (user) {
        await authUserDb.updateLastLogin(user.id);
        return user;
      }

      // Check if user exists by email (might have been created via OneLogin)
      if (payload.email) {
        user = await authUserDb.getUserByEmail(payload.email);
        if (user) {
          // User exists by email, update last login (don't overwrite oneloginId)
          await authUserDb.updateLastLogin(user.id);
          console.log(`Found existing user by email for Google login: ${user.email}`);
          return user;
        }
      }

      const firstName = payload.given_name || payload.name?.split(' ')[0] || '';
      const lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '';

      const newUser = await authUserDb.createUser({
        oneloginId: payload.sub,
        email: payload.email || payload.sub,
        firstName: firstName,
        lastName: lastName,
        avatarUrl: payload.picture || undefined,
        roles: ['user'],
      });

      console.log(`New user created from Google token: ${newUser.email}`);
      return newUser;
    } catch (error) {
      console.error('Error syncing user from Google token:', error);
      throw error;
    }
  }

  /**
   * Find or create user from IAP token
   * Uses email as the primary identifier
   */
  async syncUserFromIapToken(payload: IapJwtPayload, emailOverride?: string): Promise<AuthUser> {
    try {
      const email = payload.email || emailOverride;
      const externalId = payload.sub || email;

      if (!email && !externalId) {
        throw new Error('Missing IAP user identity');
      }

      let user = email ? await authUserDb.getUserByEmail(email) : null;

      if (!user && externalId) {
        user = await authUserDb.getUserByOneLoginId(externalId);
      }

      if (user) {
        await authUserDb.updateLastLogin(user.id);
        return user;
      }

      const nameSeed = email ? email.split('@')[0] : 'user';
      const newUser = await authUserDb.createUser({
        oneloginId: externalId || email || '',
        email: email || externalId || '',
        firstName: nameSeed,
        lastName: '',
        avatarUrl: undefined,
        roles: ['user'],
      });

      console.log(`New user created from IAP: ${newUser.email}`);
      return newUser;
    } catch (error) {
      console.error('Error syncing user from IAP token:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<AuthUser | null> {
    return authUserDb.getUserById(id);
  }

  /**
   * Update user roles (admin operation)
   */
  async updateUserRoles(userId: number, roles: string[]): Promise<AuthUser> {
    return authUserDb.updateUserRoles(userId, roles);
  }

  /**
   * Check if user has a specific role
   */
  hasRole(user: AuthUser, role: string): boolean {
    return user.roles.includes(role);
  }

  /**
   * Check if user has any of the provided roles
   */
  hasAnyRole(user: AuthUser, roles: string[]): boolean {
    return roles.some((role) => user.roles.includes(role));
  }

  /**
   * Check if user is admin
   */
  isAdmin(user: AuthUser): boolean {
    return this.hasRole(user, 'admin');
  }

  /**
   * Get all users (admin operation)
   */
  async getAllUsers(): Promise<AuthUser[]> {
    return authUserDb.getAllUsers();
  }
}

export default new UserService();

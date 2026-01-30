/**
 * DTOs for Authentication User responses
 * Using camelCase naming convention (Prisma standard)
 */

import { PermissionMap } from '../types/permissions';

/**
 * AuthUserDTO - User data returned in authentication responses
 */
export interface AuthUserDTO {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  avatarUrl?: string;
  permissions?: PermissionMap;
}

/**
 * AuthExchangeResponseDTO - Response from token exchange operations
 */
export interface AuthExchangeResponseDTO {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: AuthUserDTO;
}

/**
 * ScriptUserResponseDTO - Response from script user endpoint
 */
export interface ScriptUserResponseDTO {
  username: string;
  name?: string;
  givenName?: string;
  familyName?: string;
}

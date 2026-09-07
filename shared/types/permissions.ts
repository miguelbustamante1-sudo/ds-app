/**
 * Shared permission types for authentication and authorization
 */

export type PermissionAction = 'read' | 'create' | 'delete';

export type PermissionFlags = {
  read: boolean;
  create: boolean;
  delete: boolean;
};

export type PermissionMap = Record<string, PermissionFlags>;

export type PermissionSource = 'db' | 'jwt';

export interface PermissionContext {
  userId?: number;
  tokenPayload?: unknown;
}

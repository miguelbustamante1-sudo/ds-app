/**
 * DTOs for Permission entity (RBAC permissions)
 */

/**
 * PermissionDTO - Full permission data returned to client
 */
export interface PermissionDTO {
  permissionId: number;
  permissionResource: string;
  permissionRead: boolean;
  permissionWrite: boolean;
  permissionDelete: boolean;
  permissionDescription: string | null;
  updatedAt: Date | null;
}

/**
 * CreatePermissionDTO - Data required to create a new permission
 */
export interface CreatePermissionDTO {
  permissionResource: string;
  permissionRead?: boolean;
  permissionWrite?: boolean;
  permissionDelete?: boolean;
  permissionDescription?: string | null;
}

/**
 * UpdatePermissionDTO - Data allowed to be updated
 */
export interface UpdatePermissionDTO {
  permissionResource?: string;
  permissionRead?: boolean;
  permissionWrite?: boolean;
  permissionDelete?: boolean;
  permissionDescription?: string | null;
}

/**
 * DTOs for Permission entity (RBAC permissions)
 */

/**
 * PermissionDTO - Full permission data returned to client
 */
export interface PermissionDTO {
  permissionId: number;
  permissionResource: string | null;
  permissionRead: boolean;
  permissionWrite: boolean;
  permissionDelete: boolean;
  permissionDescription: string | null;
  updatedAt: Date | null;
  optionId: number;
  roleId: number;
}

/**
 * CreatePermissionDTO - Data required to create a new permission
 */
export interface CreatePermissionDTO {
  permissionRead?: boolean;
  permissionWrite?: boolean;
  permissionDelete?: boolean;
  permissionDescription?: string | null;
  optionId: number;
  roleId: number;
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

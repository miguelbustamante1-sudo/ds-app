/**
 * DTOs for SecurityRole entity (RBAC roles)
 */

/**
 * SecurityRoleDTO - Full security role data returned to client
 */
export interface SecurityRoleDTO {
  roleId: number;
  roleName: string;
  roleDescription: string | null;
  createdAt: Date | null;
}

/**
 * CreateSecurityRoleDTO - Data required to create a new security role
 */
export interface CreateSecurityRoleDTO {
  roleName: string;
  roleDescription?: string | null;
}

/**
 * UpdateSecurityRoleDTO - Data allowed to be updated
 */
export interface UpdateSecurityRoleDTO {
  roleName?: string;
  roleDescription?: string | null;
}

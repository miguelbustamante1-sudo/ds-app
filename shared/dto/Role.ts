/**
 * DTOs for Role entity (domain roles for team members)
 */

/**
 * RoleDTO - Full role data returned to client
 */
export interface RoleDTO {
  roleId: number;
  roleName: string;
  roleDescription: string | null;
}

/**
 * CreateRoleDTO - Data required to create a new role
 */
export interface CreateRoleDTO {
  roleName: string;
  roleDescription?: string | null;
}

/**
 * UpdateRoleDTO - Data allowed to be updated
 */
export interface UpdateRoleDTO {
  roleName?: string;
  roleDescription?: string | null;
}

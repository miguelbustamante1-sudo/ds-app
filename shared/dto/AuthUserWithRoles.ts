import type { SecurityRoleDTO } from './SecurityRole';

export interface AuthUserWithRolesDTO {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  lastLogin: string | null;
  assignedRoles: SecurityRoleDTO[];
}

export interface AuthUserDetailDTO {
  id: number;
  oneloginId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  lastLogin: string | null;
  inlineRoles: string[];
  rbacRole: {
    roleId: number;
    roleName: string;
    roleDescription: string | null;
  } | null;
}

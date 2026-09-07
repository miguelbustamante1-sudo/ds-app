import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type {
  SecurityRoleDTO,
  OptionDTO,
  PermissionDTO,
  AuthUserWithRolesDTO,
  AuthUserDetailDTO,
} from '@shared/dto';

// ─── Options ──────────────────────────────────────────────────────────────────

export const getOptions = () =>
  apiGet<OptionDTO[]>('/api/rbac/options');

export const createOption = (optionDescription: string, optionCreatedBy?: string | null) =>
  apiPost<OptionDTO, { opt_description: string; opt_created_by?: string | null }>(
    '/api/rbac/options',
    { opt_description: optionDescription, opt_created_by: optionCreatedBy ?? null },
  );

export const updateOption = (id: number, optionDescription: string) =>
  apiPut<OptionDTO, { opt_description: string }>(
    `/api/rbac/options/${id}`,
    { opt_description: optionDescription },
  );

export const deleteOption = (id: number) =>
  apiDelete(`/api/rbac/options/${id}`);

// ─── Roles ────────────────────────────────────────────────────────────────────

export const getRoles = () =>
  apiGet<SecurityRoleDTO[]>('/api/rbac/roles');

export const createRole = (roleName: string, roleDescription?: string | null) =>
  apiPost<SecurityRoleDTO, { rol_name: string; rol_description?: string | null }>(
    '/api/rbac/roles',
    { rol_name: roleName, rol_description: roleDescription ?? null },
  );

export const updateRole = (id: number, roleName: string, roleDescription?: string | null) =>
  apiPut<SecurityRoleDTO, { rol_name: string; rol_description?: string | null }>(
    `/api/rbac/roles/${id}`,
    { rol_name: roleName, rol_description: roleDescription ?? null },
  );

export const deleteRole = (id: number) =>
  apiDelete(`/api/rbac/roles/${id}`);

// ─── Permissions ──────────────────────────────────────────────────────────────

/** Fetches ALL permissions. The caller must filter by roleId in memory (the
 *  backend GET does not support query params yet). */
export const getPermissions = () =>
  apiGet<PermissionDTO[]>('/api/rbac/permissions');

export const createPermission = (payload: {
  per_read: boolean;
  per_write: boolean;
  per_delete: boolean;
  opt_id: number;
  rol_id: number;
  per_resource?: string | null;
  per_description?: string | null;
}) => apiPost<PermissionDTO, typeof payload>('/api/rbac/permissions', payload);

export const updatePermission = (id: number, payload: {
  per_read: boolean;
  per_write: boolean;
  per_delete: boolean;
  per_description?: string | null;
}) => apiPut<PermissionDTO, typeof payload>(`/api/rbac/permissions/${id}`, payload);

export const deletePermission = (id: number) =>
  apiDelete(`/api/rbac/permissions/${id}`);

// ─── Auth Users (with assigned roles) ────────────────────────────────────────

export const getAuthUsersWithRoles = () =>
  apiGet<AuthUserWithRolesDTO[]>('/api/rbac/auth-users');

export const assignRoleToUser = (userId: number, roleId: number) =>
  apiPost<unknown, { usr_id: number; rol_id: number }>(
    '/api/rbac/user-roles',
    { usr_id: userId, rol_id: roleId },
  );

export const removeRoleFromUser = (userId: number, roleId: number) =>
  apiDelete(`/api/rbac/user-roles/user/${userId}/role/${roleId}`);

export const getAuthUserByDsUser = (dsUserId: number) =>
  apiGet<AuthUserDetailDTO | null>(`/api/rbac/auth-users/by-ds-user/${dsUserId}`);

export const updateAuthUserInlineRoles = (authUserId: number, roles: string[]) =>
  apiPut<{ id: number; roles: string[] }, { roles: string[] }>(
    `/api/rbac/auth-users/${authUserId}/inline-roles`,
    { roles }
  );

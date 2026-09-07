import { useAuth } from '@/auth/auth-provider';
import type { PermissionMap } from '@shared/types/permissions';

type PermissionAction = 'read' | 'create' | 'delete';

/**
 * Hook for checking user permissions in the frontend.
 * Permissions are loaded from the auth context after login.
 *
 * @example
 * const { canRead, canCreate, canDelete } = usePermissions();
 *
 * // Check if user can view Holidays menu item
 * if (canRead('Holidays')) { ... }
 *
 * // Check if user can add a new holiday
 * if (canCreate('Holidays')) { ... }
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const permissions: PermissionMap = user?.permissions || {};

  /**
   * Check if user has a specific permission
   * @param resource - The resource name (e.g., 'Holidays', 'TeamMembers')
   * @param action - The action ('read', 'create', 'delete')
   */
  const can = (resource: string, action: PermissionAction): boolean => {
    return permissions[resource]?.[action] ?? false;
  };

  /** Check if user can read a resource (view in menu, access page) */
  const canRead = (resource: string) => can(resource, 'read');

  /** Check if user can create/edit a resource (show add/edit buttons) */
  const canCreate = (resource: string) => can(resource, 'create');

  /** Check if user can delete a resource (show delete button) */
  const canDelete = (resource: string) => can(resource, 'delete');

  /**
   * Check if user has any permission on a resource
   */
  const hasAny = (resource: string): boolean => {
    const flags = permissions[resource];
    return Boolean(flags?.read || flags?.create || flags?.delete);
  };

  return {
    permissions,
    can,
    canRead,
    canCreate,
    canDelete,
    hasAny,
  };
};

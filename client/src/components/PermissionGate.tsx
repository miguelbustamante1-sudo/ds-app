import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

type PermissionAction = 'read' | 'create' | 'delete';

interface PermissionGateProps {
  /** The resource to check permissions for */
  resource: string;
  /** The action required (defaults to 'read') */
  action?: PermissionAction;
  /** Content to show if user has permission */
  children: ReactNode;
  /** Optional content to show if user lacks permission */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on user permissions.
 *
 * @example
 * // Only show if user can read Holidays
 * <PermissionGate resource="Holidays">
 *   <HolidaysMenuItem />
 * </PermissionGate>
 *
 * @example
 * // Only show Add button if user can create
 * <PermissionGate resource="Holidays" action="create">
 *   <Button>Add Holiday</Button>
 * </PermissionGate>
 *
 * @example
 * // Show different content based on permission
 * <PermissionGate
 *   resource="Holidays"
 *   action="create"
 *   fallback={<span className="text-muted-foreground">Read only</span>}
 * >
 *   <Button>Edit</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  resource,
  action = 'read',
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can } = usePermissions();

  if (!can(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

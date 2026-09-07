import { useMemo } from 'react';
import { useAuth } from '@/auth/auth-provider';
import { usePermissions } from '@/hooks/usePermissions';
import type { HubButton } from '@/config/hubs/hub.types';

/**
 * useVisibleHubButtons
 * ====================
 * Filters a hub's button list using the same permission and role logic
 * applied by the sidebar renderer (SidebarMenu → filterByPermissions).
 *
 * Rules (mirrors sidebar behaviour exactly):
 *  - If `role` is set, the user must have that role.
 *  - If `permission` is set, the user must have read access to that resource.
 *  - If both are set, BOTH conditions must be satisfied.
 *  - If neither is set, the button is visible to all authenticated users.
 *
 * @param buttons  Full unfiltered list from a HubConfig.
 * @returns        Filtered list of buttons the current user may see.
 */
export function useVisibleHubButtons(buttons: HubButton[]): HubButton[] {
  const { user } = useAuth();
  const { canRead } = usePermissions();

  return useMemo(() => {
    return buttons.filter((btn) => {
      // Role check
      if (btn.role && !user?.roles.includes(btn.role)) return false;
      // Permission check
      if (btn.permission && !canRead(btn.permission)) return false;
      return true;
    });
  }, [buttons, user?.roles, canRead]);
}

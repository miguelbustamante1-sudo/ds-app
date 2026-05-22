import { type LucideIcon } from 'lucide-react';

export interface MenuItem {
  title?: string;
  desc?: string;
  img?: string;
  icon?: LucideIcon;
  path?: string;
  rootPath?: string;
  childrenIndex?: number;
  heading?: string;
  children?: MenuConfig;
  disabled?: boolean;
  collapse?: boolean;
  collapseTitle?: string;
  expandTitle?: string;
  badge?: string;
  separator?: boolean;
  /**
   * Permission resource required to view this menu item.
   * If set, the item will only be visible if the user has 'read' permission for this resource.
   * Example: 'Holidays', 'TeamMembers', 'Countries'
   */
  permission?: string;
  /**
   * Role required to view this menu item.
   * If set, the item will only be visible if the user has this role.
   * Example: 'admin'
   */
  role?: string;
  /**
   * Sub-permissions for dynamic visibility checks beyond role/permission.
   * Supported values:
   *   'supervisor' - only show if the current user has at least one direct report
   */
  subPermission?: string[];
}

export type MenuConfig = MenuItem[];

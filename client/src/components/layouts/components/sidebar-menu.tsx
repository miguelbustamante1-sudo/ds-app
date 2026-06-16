'use client';

import { JSX, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Accordion as AccordionPrimitive } from 'radix-ui';
import { ChevronDown } from 'lucide-react';
import { MENU_SIDEBAR } from '@/config/layout-1.config';
import { MenuConfig, MenuItem } from '@/config/types';
import { cn } from '@/lib/utils';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@/components/ui/accordion-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/auth/auth-provider';
import { useIsSupervisor } from '@/hooks/useIsSupervisor';

export function SidebarMenu() {
  const { pathname } = useLocation();
  const { canRead } = usePermissions();
  const { user } = useAuth();
  const isSupervisor = useIsSupervisor(user?.teamMemberId);

  /**
   * Filter menu items based on user permissions, roles, and sub-permissions.
   * Items without a permission or role field are always visible.
   * Items with a permission field require the user to have 'read' permission for that resource.
   * Items with a role field require the user to have that role.
   * Items with subPermission: ['supervisor'] are only visible to supervisors (users with direct reports).
   * Items with subPermission: ['admin'] are only visible to admin role users.
   */
  const filterByPermissions = useCallback(
    (items: MenuConfig): MenuConfig => {
      return items
        .filter((item) => {
          // Check role requirement — supports single string or array (OR logic)
          if (item.role) {
            const required = Array.isArray(item.role) ? item.role : [item.role];
            if (!required.some((r) => user?.roles.includes(r))) return false;
          }
          // If no permission specified, show (role/subPermission already passed)
          if (!item.permission) return true;
          // Otherwise, check if user has read permission
          const isReadable = canRead(item.permission);

          if(isReadable && item.subPermission){
            // Check existing sub-permission requirements
            return (item.subPermission.includes('supervisor') && isSupervisor) || (item.subPermission.includes('admin') && user?.roles.includes('admin'));
          }

          return isReadable;
        })
        .map((item) => {
          // Recursively filter children
          if (item.children) {
            const filteredChildren = filterByPermissions(item.children);
            // If all children are filtered out, don't show the parent either
            // (unless it has its own path)
            if (filteredChildren.length === 0 && !item.path) {
              return null;
            }
            return { ...item, children: filteredChildren };
          }
          return item;
        })
        .filter((item): item is MenuItem => item !== null);
    },
    [canRead, user?.roles, isSupervisor],
  );

  // Memoize filtered menu to avoid recalculating on every render
  const filteredMenu = useMemo(
    () => filterByPermissions(MENU_SIDEBAR),
    [filterByPermissions],
  );

  // Memoize matchPath to prevent unnecessary re-renders
  const matchPath = useCallback(
    (path: string): boolean =>
      path === pathname || (path.length > 1 && pathname.startsWith(path) && path !== '/'),
    [pathname],
  );

  // Global classNames for consistent styling
  const classNames: AccordionMenuClassNames = {
    root: 'lg:ps-1 space-y-3',
    group: 'gap-px',
    label:
      'uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px',
    separator: '',
    item: 'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium',
    sub: '',
    subTrigger:
      'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium',
    subContent: 'py-0',
    indicator: '',
  };

  const buildMenu = (items: MenuConfig): JSX.Element[] => {
    return items.map((item: MenuItem, index: number) => {
      if (item.heading) {
        return buildMenuHeading(item, index);
      } else if (item.disabled) {
        return buildMenuItemRootDisabled(item, index);
      } else {
        return buildMenuItemRoot(item, index);
      }
    });
  };

  const buildMenuItemRoot = (item: MenuItem, index: number): JSX.Element => {
    if (item.children) {
      const isActive = matchPath(item.path || '');
      return (
        <AccordionMenuSub key={index} value={item.path || `root-${index}`}>
          <AccordionPrimitive.Header className="flex items-center">
            <Link
              to={item.path || '#'}
              className={cn(
                'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium cursor-pointer select-none transition-colors hover:bg-transparent',
                isActive
                  ? 'text-primary bg-muted font-medium'
                  : 'text-accent-foreground hover:text-primary',
              )}
            >
              {item.icon && (
                <item.icon
                  data-slot="accordion-menu-icon"
                  className="size-4 shrink-0 opacity-60"
                />
              )}
              <span data-slot="accordion-menu-title">{item.title}</span>
            </Link>
            <AccordionPrimitive.Trigger className="flex items-center justify-center size-8 rounded-lg cursor-pointer text-muted-foreground hover:bg-transparent hover:text-primary transition-colors shrink-0">
              <ChevronDown
                data-slot="accordion-menu-sub-indicator"
                className="size-3.5 transition-transform duration-200 [[data-state=open]>&]:-rotate-180"
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `root-${index}`}
            className="ps-6"
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(item.children, 1)}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-sm font-medium"
        >
          <Link
            to={item.path || '#'}
            className="flex items-center gap-2 grow"
          >
            {item.icon && <item.icon data-slot="accordion-menu-icon" />}
            <span data-slot="accordion-menu-title">{item.title}</span>
          </Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemRootDisabled = (
    item: MenuItem,
    index: number,
  ): JSX.Element => {
    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-${index}`}
        className="text-sm font-medium"
      >
        {item.icon && <item.icon data-slot="accordion-menu-icon" />}
        <span data-slot="accordion-menu-title">{item.title}</span>
        {item.disabled && (
          <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
            Soon
          </Badge>
        )}
      </AccordionMenuItem>
    );
  };

  const buildMenuItemChildren = (
    items: MenuConfig,
    level: number = 0,
  ): JSX.Element[] => {
    return items.map((item: MenuItem, index: number) => {
      if (item.disabled) {
        return buildMenuItemChildDisabled(item, index, level);
      } else {
        return buildMenuItemChild(item, index, level);
      }
    });
  };

  const buildMenuItemChild = (
    item: MenuItem,
    index: number,
    level: number = 0,
  ): JSX.Element => {
    if (item.children) {
      return (
        <AccordionMenuSub
          key={index}
          value={item.path || `child-${level}-${index}`}
        >
          <AccordionMenuSubTrigger className="text-[13px]">
            {item.collapse ? (
              <span className="text-muted-foreground">
                <span className="hidden [[data-state=open]>span>&]:inline">
                  {item.collapseTitle}
                </span>
                <span className="inline [[data-state=open]>span>&]:hidden">
                  {item.expandTitle}
                </span>
              </span>
            ) : (
              item.title
            )}
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `child-${level}-${index}`}
            className={cn(
              'ps-4',
              !item.collapse && 'relative',
              !item.collapse && (level > 0 ? '' : ''),
            )}
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(
                item.children,
                item.collapse ? level : level + 1,
              )}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-[13px]"
        >
          <Link to={item.path || '#'}>{item.title}</Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemChildDisabled = (
    item: MenuItem,
    index: number,
    level: number = 0,
  ): JSX.Element => {
    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-child-${level}-${index}`}
        className="text-[13px]"
      >
        <span data-slot="accordion-menu-title">{item.title}</span>
        {item.disabled && (
          <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
            Soon
          </Badge>
        )}
      </AccordionMenuItem>
    );
  };

  const buildMenuHeading = (item: MenuItem, index: number): JSX.Element => {
    return <AccordionMenuLabel key={index}>{item.heading}</AccordionMenuLabel>;
  };

  return (
    <ScrollArea className="flex grow shrink-0 py-5 px-5 lg:h-[calc(100vh-5.5rem)]">
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="single"
        collapsible
        classNames={classNames}
      >
        {buildMenu(filteredMenu)}
      </AccordionMenu>
    </ScrollArea>
  );
}

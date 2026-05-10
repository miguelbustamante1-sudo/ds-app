import { Bell, BookUser, Bug, Search } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { Button } from '@/components/ui/button';
import { SearchDialog } from '@/components/layouts/shared/dialogs/search/search-dialog';
import { NotificationsSheet } from '@/components/layouts/shared/topbar/notifications-sheet';
import { UserDropdownMenu } from '@/components/layouts/shared/topbar/user-dropdown-menu';
import { PocDirectoryDialog } from '@/components/layouts/shared/dialogs/poc-directory-dialog';
import { useAuth } from '@/auth/auth-provider';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';

export function Header() {
  const scrollPosition = useScrollPosition();
  const headerSticky: boolean = scrollPosition > 0;
  const { user } = useAuth();
  const avatar = user?.avatarUrl || toAbsoluteUrl('/media/avatars/blank.png');
  const { canRead } = usePermissions();
  const { unreadCount, refetch: refetchUnreadCount } = useUnreadCount({ enabled: canRead('NotificationCenter') });

  return (
    <header
      className={cn(
        'header fixed top-0 z-10 start-0 flex items-stretch shrink-0 border-b border-transparent bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)]',
        headerSticky && 'border-b border-border',
      )}
    >
      <div className="container-fluid flex justify-end items-stretch lg:gap-4">
        {/* HeaderTopbar */}
        <div className="flex items-center gap-3">
          <PocDirectoryDialog
            trigger={
              <Button
                variant="ghost"
                mode="icon"
                shape="circle"
                className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                title="POC Directory"
              >
                <BookUser className="size-4.5!" />
              </Button>
            }
          />
          <a
            href="https://forms.monday.com/forms/5bf6f981f7dd8356c9ef24b4be40b97f?r=use1"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="ghost"
              mode="icon"
              shape="circle"
              className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
              title="Report a Bug"
            >
              <Bug className="size-4.5!" />
            </Button>
          </a>
          <SearchDialog
            trigger={
              <Button
                variant="ghost"
                mode="icon"
                shape="circle"
                className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
              >
                <Search className="size-4.5!" />
              </Button>
            }
          />
          <PermissionGate resource="NotificationCenter">
            <NotificationsSheet
              refetchUnreadCount={refetchUnreadCount}
              trigger={
                <Button
                  variant="ghost"
                  mode="icon"
                  shape="circle"
                  className="relative size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                >
                  <Bell className="size-4.5!" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -end-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              }
            />
          </PermissionGate>
          <UserDropdownMenu
            trigger={
              <img
                className="size-9 rounded-full border-2 border-green-500 shrink-0 cursor-pointer"
                src={avatar}
                alt="User Avatar"
              />
            }
          />
        </div>
      </div>
    </header>
  );
}

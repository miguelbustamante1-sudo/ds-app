import { ReactNode, useEffect, useState, Fragment } from 'react';
import { Bell, Calendar, Settings, Settings2, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './notifications/item-mapper';

interface NotificationsSheetProps {
  trigger: ReactNode;
  refetchUnreadCount?: () => Promise<void>;
}

const CATEGORY_MAP: Record<string, string | undefined> = {
  all: undefined,
  inbox: 'inbox',
  team: 'team',
  following: 'following',
};

function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-2.5 px-5 py-3.5 animate-pulse">
          <div className="size-9 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <Bell className="size-8 mb-2 opacity-50" />
      <span>No notifications</span>
    </div>
  );
}

export function NotificationsSheet({ trigger, refetchUnreadCount }: NotificationsSheetProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [mutating, setMutating] = useState(false);
  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    archiveAll,
    acknowledgeTimeOff,
    declineTimeOff,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications(CATEGORY_MAP[activeTab]);
  }, [activeTab, fetchNotifications]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleMarkAsRead = async (recipientId: number) => {
    await markAsRead(recipientId);
    await refetchUnreadCount?.();
  };

  const handleMarkAllAsRead = async () => {
    setMutating(true);
    await markAllAsRead();
    await refetchUnreadCount?.();
    setMutating(false);
  };

  const handleAcknowledge = async (timeOffId: number, recipientId: number) => {
    await acknowledgeTimeOff(timeOffId, recipientId);
    await refetchUnreadCount?.();
  };

  const handleDecline = async (timeOffId: number, recipientId: number) => {
    await declineTimeOff(timeOffId, recipientId);
    await refetchUnreadCount?.();
  };

  const handleArchiveAll = async () => {
    setMutating(true);
    await archiveAll();
    await refetchUnreadCount?.();
    setMutating(false);
  };

  const hasUnreadInCategory = (category: string | undefined) => {
    if (!category) return notifications.some((n) => !n.isRead);
    return notifications.some((n) => !n.isRead && n.categoryName === category);
  };

  const renderNotificationList = () => {
    if (loading) return <LoadingSkeleton />;
    if (notifications.length === 0) return <EmptyState />;

    return (
      <div className="flex flex-col gap-5">
        {notifications.map((notification, index) => (
          <Fragment key={notification.id}>
            <NotificationItem
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onAcknowledge={handleAcknowledge}
              onDecline={handleDecline}
            />
            {index < notifications.length - 1 && <Separator />}
          </Fragment>
        ))}
      </div>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="gap-0 sm:w-[500px] inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">Notifications</SheetTitle>
        </SheetHeader>
        <SheetBody className="grow p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            <Tabs defaultValue="all" className="w-full relative" onValueChange={handleTabChange}>
              <TabsList variant="line" className="w-full px-5 mb-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="inbox" className="relative">
                  Inbox
                  {hasUnreadInCategory('inbox') && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 absolute top-1 -end-1" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="team" className="relative">
                  Team
                  {hasUnreadInCategory('team') && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 absolute top-1 -end-1" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="following" className="relative">
                  Following
                  {hasUnreadInCategory('following') && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 absolute top-1 -end-1" />
                  )}
                </TabsTrigger>
                <div className="grow flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        mode="icon"
                        className="mb-1"
                      >
                        <Settings className="size-4.5!" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-44"
                      side="bottom"
                      align="end"
                    >
                      <DropdownMenuItem asChild>
                        <Link to="#">
                          <Users /> Invite Users
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Settings2 />
                          <span>Team Settings</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="w-44">
                            <DropdownMenuItem asChild>
                              <Link to="#">
                                <Shield />
                                Find Members
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="#">
                                <Calendar /> Meetings
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="#">
                                <Shield /> Group Settings
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuItem asChild>
                        <Link to="#">
                          <Shield /> Group Settings
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                {renderNotificationList()}
              </TabsContent>

              <TabsContent value="inbox" className="mt-0">
                {renderNotificationList()}
              </TabsContent>

              <TabsContent value="team" className="mt-0">
                {renderNotificationList()}
              </TabsContent>

              <TabsContent value="following" className="mt-0">
                {renderNotificationList()}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5 grid grid-cols-2 gap-2.5">
          <Button variant="outline" onClick={handleArchiveAll} disabled={mutating}>
            Archive all
          </Button>
          <Button variant="outline" onClick={handleMarkAllAsRead} disabled={mutating}>
            Mark all as read
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

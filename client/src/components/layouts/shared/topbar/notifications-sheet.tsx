import { ReactNode, useEffect, useState, Fragment } from 'react';
import { Bell, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './notifications/item-mapper';

interface NotificationsSheetProps {
  trigger: ReactNode;
  refetchUnreadCount?: () => Promise<void>;
}


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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
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
    fetchNotifications();
  }, [fetchNotifications]);

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
              onAccept={handleAcknowledge}
              onDecline={handleDecline}
              onNavigate={() => setOpen(false)}
            />
            {index < notifications.length - 1 && <Separator />}
          </Fragment>
        ))}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="gap-0 sm:w-[500px] inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">Notifications</SheetTitle>
        </SheetHeader>
        <SheetBody className="grow p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            {renderNotificationList()}
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5 w-full">
            <Button variant="outline" onClick={handleArchiveAll} disabled={mutating}>
              Archive all
            </Button>
            <Button variant="outline" onClick={handleMarkAllAsRead} disabled={mutating}>
              Mark all as read
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => {
              setOpen(false);
              navigate('/notification-center');
            }}
          >
            <ExternalLink className="size-4 me-1.5" />
            View all notifications
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

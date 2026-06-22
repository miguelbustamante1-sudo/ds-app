import { useEffect, useCallback, Fragment } from 'react';
import { Bell, Mail, MailOpen, Archive, ArchiveRestore } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { NotificationItem } from './item-mapper';

type TabValue = 'unread' | 'read' | 'archived';

interface NotificationCenterProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  onNavigate?: () => void;
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

function EmptyState({ tab }: { tab: TabValue }) {
  const messages: Record<TabValue, string> = {
    unread: 'No unread notifications',
    read: 'No read notifications',
    archived: 'No archived notifications',
  };
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Bell className="size-8 mb-2 opacity-50" />
      <span>{messages[tab]}</span>
    </div>
  );
}

export function NotificationCenter({
  activeTab,
  onTabChange,
  onNavigate,
  refetchUnreadCount,
}: NotificationCenterProps) {
  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    archiveSingle,
    unarchiveSingle,
    acknowledgeTimeOff,
    declineTimeOff,
  } = useNotifications();

  const { counts, refetch: refetchCounts } = useNotificationCounts();

  useEffect(() => {
    refetchCounts();
  }, [refetchCounts]);

  useEffect(() => {
    fetchNotifications(undefined, activeTab);
  }, [activeTab, fetchNotifications]);

  const afterMutation = useCallback(async () => {
    await refetchCounts();
    await refetchUnreadCount?.();
  }, [refetchCounts, refetchUnreadCount]);

  const handleMarkAsRead = async (recipientId: number) => {
    await markAsRead(recipientId);
    await afterMutation();
  };

  const handleMarkAsUnread = async (recipientId: number) => {
    await markAsUnread(recipientId);
    await afterMutation();
  };

  const handleArchiveSingle = async (recipientId: number) => {
    await archiveSingle(recipientId);
    await afterMutation();
  };

  const handleUnarchiveSingle = async (recipientId: number) => {
    await unarchiveSingle(recipientId);
    await afterMutation();
  };

  const handleAcknowledge = async (timeOffId: number, recipientId: number) => {
    await acknowledgeTimeOff(timeOffId, recipientId);
    await afterMutation();
  };

  const handleDecline = async (timeOffId: number, recipientId: number) => {
    await declineTimeOff(timeOffId, recipientId);
    await afterMutation();
  };

  function renderItemActions(notificationId: number) {
    switch (activeTab) {
      case 'unread':
        return (
          <div className="flex gap-1 shrink-0 px-3">
            <Button
              variant="ghost"
              size="sm"
              mode="icon"
              onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notificationId); }}
              title="Mark as read"
            >
              <MailOpen className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              mode="icon"
              onClick={(e) => { e.stopPropagation(); handleArchiveSingle(notificationId); }}
              title="Archive"
            >
              <Archive className="size-4" />
            </Button>
          </div>
        );
      case 'read':
        return (
          <div className="flex gap-1 shrink-0 px-3">
            <Button
              variant="ghost"
              size="sm"
              mode="icon"
              onClick={(e) => { e.stopPropagation(); handleMarkAsUnread(notificationId); }}
              title="Mark as unread"
            >
              <Mail className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              mode="icon"
              onClick={(e) => { e.stopPropagation(); handleArchiveSingle(notificationId); }}
              title="Archive"
            >
              <Archive className="size-4" />
            </Button>
          </div>
        );
      case 'archived':
        return (
          <div className="flex gap-1 shrink-0 px-3">
            <Button
              variant="ghost"
              size="sm"
              mode="icon"
              onClick={(e) => { e.stopPropagation(); handleUnarchiveSingle(notificationId); }}
              title="Unarchive"
            >
              <ArchiveRestore className="size-4" />
            </Button>
          </div>
        );
    }
  }

  function renderList() {
    if (loading) return <LoadingSkeleton />;
    if (notifications.length === 0) return <EmptyState tab={activeTab} />;

    return (
      <div className="flex flex-col">
        {notifications.map((notification, index) => (
          <Fragment key={notification.id}>
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={activeTab === 'unread' ? handleMarkAsRead : () => {}}
                  onAccept={handleAcknowledge}
                  onDecline={handleDecline}
                  onNavigate={onNavigate}
                />
              </div>
              {renderItemActions(notification.id)}
            </div>
            {index < notifications.length - 1 && <Separator />}
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabValue)} className="w-full">
      <div className="px-5 pt-3 border-b border-border">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="unread" className="relative">
            Unread
            {counts.unread > 0 && (
              <Badge variant="primary" size="sm" className="ms-1.5">
                {counts.unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="read" className="relative">
            Read
            {counts.read > 0 && (
              <Badge variant="secondary" size="sm" className="ms-1.5">
                {counts.read}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="relative">
            Archived
            {counts.archived > 0 && (
              <Badge variant="secondary" size="sm" className="ms-1.5">
                {counts.archived}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="unread" className="mt-0">{renderList()}</TabsContent>
      <TabsContent value="read" className="mt-0">{renderList()}</TabsContent>
      <TabsContent value="archived" className="mt-0">{renderList()}</TabsContent>
    </Tabs>
  );
}

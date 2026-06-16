import { ReactNode, useState } from 'react';
import { ExternalLink } from 'lucide-react';
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
import { NotificationCenter } from './notifications/notification-center';

interface NotificationsSheetProps {
  trigger: ReactNode;
  refetchUnreadCount?: () => Promise<void>;
}

export function NotificationsSheet({ trigger, refetchUnreadCount }: NotificationsSheetProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'read' | 'archived'>('unread');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="gap-0 sm:w-[500px] inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">Notifications</SheetTitle>
        </SheetHeader>
        <SheetBody className="grow p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            <NotificationCenter
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onNavigate={() => setOpen(false)}
              refetchUnreadCount={refetchUnreadCount}
            />
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
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

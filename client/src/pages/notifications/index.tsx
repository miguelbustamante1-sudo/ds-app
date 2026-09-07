import { useState } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { NotificationCenter } from '@/components/layouts/shared/topbar/notifications/notification-center';

type TabValue = 'unread' | 'read' | 'archived';

export function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('unread');

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Notification Center</ToolbarPageTitle>
          <ToolbarDescription>
            Review and manage all your notifications
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6">
        <div className="bg-card rounded-lg border">
          <NotificationCenter
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
}

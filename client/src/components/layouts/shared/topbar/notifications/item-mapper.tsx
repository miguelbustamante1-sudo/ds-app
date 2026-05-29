import React from 'react';
import { timeAgo } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { NotificationDTO } from '@shared/dto';
import GenericNotificationItem from './item-generic';
import Item1 from './item-1';
import Item2 from './item-2';
import Item3 from './item-3';
import Item4 from './item-4';
import Item5 from './item-5';
import Item6 from './item-6';
import Item7 from './item-7';
import Item8 from './item-8';
import Item9 from './item-9';
import Item10 from './item-10';
import Item11 from './item-11';
import Item12 from './item-12';
import Item13 from './item-13';
import Item14 from './item-14';
import Item15 from './item-15';
import Item16 from './item-16';
import Item17 from './item-17';
import Item18 from './item-18';
import Item19 from './item-19';
import Item20 from './item-20';

const ITEM_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'item-1': Item1,
  'item-2': Item2,
  'item-3': Item3,
  'item-4': Item4,
  'item-5': Item5,
  'item-6': Item6,
  'item-7': Item7,
  'item-8': Item8,
  'item-9': Item9,
  'item-10': Item10,
  'item-11': Item11,
  'item-12': Item12,
  'item-13': Item13,
  'item-14': Item14,
  'item-15': Item15,
  'item-16': Item16,
  'item-17': Item17,
  'item-18': Item18,
  'item-19': Item19,
  'item-20': Item20,
};

interface NotificationItemProps {
  notification: NotificationDTO;
  onMarkAsRead: (recipientId: number) => void;
  onAcknowledge?: (timeOffId: number, recipientId: number) => void;
  onDecline?: (timeOffId: number, recipientId: number) => void;
  onNavigate?: () => void;
}

export function NotificationItem({ notification, onMarkAsRead, onAcknowledge, onDecline, onNavigate }: NotificationItemProps) {
  const { itemType, payload, createdAt, isRead, actionType, id } = notification;
  const ItemComponent = ITEM_COMPONENTS[itemType];
  const timeDisplay = timeAgo(createdAt);

  const handleClick = () => {
    if (!isRead) {
      onMarkAsRead(id);
    }
  };

  const typedPayload = payload as Record<string, unknown>;

  if (!ItemComponent) {
    return (
      <div
        className={cn(
          'cursor-pointer',
          !isRead && 'bg-primary/5 border-l-2 border-primary',
        )}
        onClick={handleClick}
      >
        <GenericNotificationItem
          title={typedPayload.title as string | undefined}
          message={typedPayload.message as string | undefined}
          link={typedPayload.link as string | null | undefined}
          timeDisplay={timeDisplay}
          itemType={itemType}
          actionType={actionType}
        />
      </div>
    );
  }

  const isTimeOffAction = typedPayload.sourceEntity === 'TimeOff' && actionType === 'actionable';

  const extraProps: Record<string, unknown> = { onNavigate, notificationRecipientId: id };
  if (isTimeOffAction && onAcknowledge && onDecline) {
    const sourceId = typedPayload.sourceId as number;
    extraProps.onAccept = () => onAcknowledge(sourceId, id);
    extraProps.onDecline = () => onDecline(sourceId, id);
  }

  return (
    <div
      className={cn(
        'cursor-pointer',
        !isRead && 'bg-primary/5 border-l-2 border-primary',
      )}
      onClick={handleClick}
    >
      <ItemComponent
        {...typedPayload}
        timeDisplay={timeDisplay}
        actionType={actionType}
        {...extraProps}
      />
    </div>
  );
}

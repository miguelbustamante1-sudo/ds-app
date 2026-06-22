import { AvatarGroup } from '@/components/layouts/shared/common/avatar-group';
import { Link } from 'react-router-dom';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarIndicator,
  AvatarStatus,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Item10Props {
  userName?: string;
  avatar?: string;
  badgeColor?: 'online' | 'offline' | 'busy' | 'away' | null;
  description?: string;
  timeDisplay?: string;
  info?: string;
  meetingMonth?: string;
  meetingDay?: string;
  meetingTitle?: string;
  meetingTime?: string;
  attendees?: Array<{ path?: string; fallback?: string; variant?: string }>;
  actionType?: string;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function Item10({
  userName = 'Nova Hawthorne',
  avatar = '300-15.png',
  badgeColor = 'online',
  description = 'sent you an meeting invation',
  timeDisplay = '2 days ago',
  info = 'Dev Team',
  meetingMonth = 'Apr',
  meetingDay = '12',
  meetingTitle = 'Peparation For Release',
  meetingTime = '9:00 PM - 10:00 PM',
  attendees = [
    { path: '/media/avatars/300-1.png' },
    { path: '/media/avatars/300-2.png' },
    { path: '/media/avatars/300-3.png' },
    { fallback: '+3', variant: 'text-white size-6 ring-background bg-green-500' },
  ],
  actionType,
  onAccept,
  onDecline,
}: Item10Props) {
  return (
    <div className="flex grow gap-2 px-5 py-3.5">
      <Avatar>
        <AvatarImage src={`/media/avatars/${avatar}`} alt="avatar" />
        <AvatarFallback>CH</AvatarFallback>
        <AvatarIndicator className="-end-1.5 -bottom-1.5">
          <AvatarStatus variant={badgeColor} className="size-2.5" />
        </AvatarIndicator>
      </Avatar>

      <div className="flex flex-col gap-3 grow">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium mb-px">
            <Link to="#" className="hover:text-primary text-mono font-semibold">
              {userName}
            </Link>
            <span className="text-secondary-foreground">
              {' '}
              {description}{' '}
            </span>
          </div>
          <span className="flex items-center text-xs font-medium text-muted-foreground">
            {timeDisplay}
            <span className="rounded-full size-1 bg-mono/30 mx-1.5"></span>
            {info}
          </span>
        </div>

        <Card className="shadow-none p-2.5 rounded-lg bg-muted/70">
          <div className="flex items-center justify-between flex-wrap gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="border border-warning-transparent rounded-lg">
                <div className="flex items-center justify-center border-b border-b-warning-transparent bg-yellow-400/10 rounded-t-lg">
                  <span className="text-xs text-yellow-400 fw-medium p-1.5">
                    {meetingMonth}
                  </span>
                </div>
                <div className="flex items-center justify-center size-9">
                  <span className="fw-semibold text-mono text-md tracking-tight">
                    {meetingDay}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Link
                  to="#"
                  className="hover:text-primary font-medium text-secondary-foreground text-xs"
                >
                  {meetingTitle}
                </Link>
                <span className="font-medium text-secondary-foreground text-xs">
                  {meetingTime}
                </span>
              </div>
            </div>

            <AvatarGroup
              size="size-6"
              group={attendees}
            />
          </div>
        </Card>

        {actionType !== 'readonly' && (
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" variant="outline" onClick={onDecline}>
              Decline
            </Button>
            <Button size="sm" variant="mono" onClick={onAccept}>
              Accept
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

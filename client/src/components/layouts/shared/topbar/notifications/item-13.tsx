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

interface Item13Props {
  userName?: string;
  avatar?: string;
  badgeColor?: 'online' | 'offline' | 'busy' | 'away' | null;
  description?: string;
  link?: string;
  timeDisplay?: string;
  info?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  actionType?: string;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function Item13({
  userName = 'Samuel Lee',
  avatar = '300-25.png',
  badgeColor = 'online',
  description = 'requested to add user to',
  link = 'TechSynergy',
  timeDisplay = '22 hours ago',
  info = 'Dev Team',
  targetUserName = 'Ronald Richards',
  targetUserEmail = 'ronald.richards@gmail.com',
  actionType,
  onAccept,
  onDecline,
}: Item13Props) {
  return (
    <div className="flex grow gap-2.5 px-5 py-3.5">
      <Avatar>
        <AvatarImage src={`/media/avatars/${avatar}`} alt="avatar" />
        <AvatarFallback>CH</AvatarFallback>
        <AvatarIndicator className="-end-1.5 -bottom-1.5">
          <AvatarStatus variant={badgeColor} className="size-2.5" />
        </AvatarIndicator>
      </Avatar>

      <div className="flex flex-col gap-3.5 grow">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium mb-px">
            <Link to="#" className="hover:text-primary text-mono font-semibold">
              {userName}
            </Link>
            <span className="text-secondary-foreground">
              {' '}
              {description}{' '}
            </span>
            <Link
              to="#"
              className="hover:text-primary text-primary font-semibold"
            >
              {link}
            </Link>
          </div>

          <span className="flex items-center text-xs font-medium text-muted-foreground">
            {timeDisplay}
            <span className="rounded-full size-1 bg-mono/30 mx-1.5"></span>
            {info}
          </span>
        </div>

        <Card className="shadow-none flex items-center flex-row justify-between gap-1.5 px-2.5 py-2 rounded-lg bg-muted/70">
          <div className="flex flex-col">
            <Link
              to="#"
              className="hover:text-primary font-medium text-mono text-xs"
            >
              {targetUserName}
            </Link>
            <Link
              to="#"
              className="hover:text-primary text-muted-foreground font-medium text-xs"
            >
              {targetUserEmail}
            </Link>
          </div>

          <Link
            to="#"
            className="hover:text-primary text-secondary-foreground font-medium text-xs"
          >
            Go to profile
          </Link>
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

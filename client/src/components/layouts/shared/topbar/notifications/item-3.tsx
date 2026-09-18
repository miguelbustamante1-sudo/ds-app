import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarIndicator,
  AvatarStatus,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface Item3Props {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null | undefined;
  description: string;
  day: string;
  timeDisplay?: string;
  info: string;
  actionType?: string;
  onAccept?: () => void;
  onDecline?: () => void;
  sourceId?: number;
  sourceEntity?: string;
}

export default function Item3({
  userName,
  avatar,
  badgeColor,
  description,
  day,
  timeDisplay,
  info,
  actionType,
  onAccept,
  onDecline,
}: Item3Props) {
  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAccept?.();
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDecline?.();
  };

  return (
    <div className="flex grow gap-2.5 px-5 py-3.5">
      <Avatar>
        <AvatarImage src={avatar?.startsWith('http') ? avatar : `/media/avatars/${avatar}`} alt="avatar" />
        <AvatarFallback>DS</AvatarFallback>
        <AvatarIndicator className="-end-1.5 -bottom-1.5">
          <AvatarStatus variant={badgeColor} className="size-2.5" />
        </AvatarIndicator>
      </Avatar>

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium mb-px">
            <span className="hover:text-primary text-mono font-semibold">
              {userName}
            </span>
            <span className="text-secondary-foreground"> {description} </span>
            <span className="text-primary underline">
              View details
            </span>
            <span className="text-secondary-foreground"> {day}</span>
          </div>
          <span className="flex items-center text-xs font-medium text-muted-foreground">
            {timeDisplay}
            <span className="rounded-full size-1 bg-mono/30 mx-1.5"></span>
            {info}
          </span>
        </div>

        {actionType !== 'readonly' && (
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" variant="outline" onClick={handleDecline}>
              Decline
            </Button>
            <Button size="sm" variant="mono" onClick={handleAccept}>
              Accept
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

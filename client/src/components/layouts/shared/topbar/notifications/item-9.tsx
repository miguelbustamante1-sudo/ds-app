import { CircleCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarIndicator,
  AvatarStatus,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TaskItem {
  label: string;
  variant: 'success' | 'outline';
}

interface Item9Props {
  userName?: string;
  avatar?: string;
  badgeColor?: 'online' | 'offline' | 'busy' | 'away' | null;
  description?: string;
  link?: string;
  timeDisplay?: string;
  info?: string;
  tasks?: TaskItem[];
  actionType?: string;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function Item9({
  userName = 'Selene Silverleaf',
  avatar = '300-21.png',
  badgeColor = 'online',
  description = 'created a tasks in',
  link = 'Design Project',
  timeDisplay = '4 days ago',
  info = 'Manager',
  tasks = [
    { label: 'Feature Prioritization', variant: 'success' },
    { label: 'Last Month User Research', variant: 'outline' },
  ],
  actionType,
  onAccept,
  onDecline,
}: Item9Props) {
  return (
    <div className="flex gap-2.5 px-5">
      <Avatar>
        <AvatarImage src={`/media/avatars/${avatar}`} alt="avatar" />
        <AvatarFallback>CH</AvatarFallback>
        <AvatarIndicator className="-end-1.5 -bottom-1.5">
          <AvatarStatus variant={badgeColor} className="size-2.5" />
        </AvatarIndicator>
      </Avatar>

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium mb-px">
            <Link to="#" className="hover:text-primary text-mono font-semibold">
              {userName}
            </Link>
            <span className="text-secondary-foreground">
              {' '}
              {description}{' '}
            </span>
            <Link to="#" className="hover:text-primary text-primary">
              {link}
            </Link>
          </div>

          <span className="flex items-center text-xs font-medium text-muted-foreground">
            {timeDisplay}
            <span className="rounded-full size-1 bg-mono/30 mx-1.5"></span>
            {info}
          </span>
        </div>

        <div className="grid gap-1.5">
          {tasks.map((task, index) => (
            <Badge
              key={index}
              size="sm"
              variant={task.variant}
              appearance={task.variant === 'success' ? 'light' : undefined}
              className={`${task.variant === 'success' ? 'text-green-500' : 'text-secondary-foreground'} me-1 text-xs`}
            >
              <CircleCheck /> {task.label}
            </Badge>
          ))}
        </div>

        {actionType === 'actionable' && onAccept && onDecline && (
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" variant="outline" onClick={onDecline}>Reject</Button>
            <Button size="sm" variant="mono" onClick={onAccept}>Approve</Button>
          </div>
        )}
      </div>
    </div>
  );
}

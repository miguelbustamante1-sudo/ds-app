import { Link } from 'react-router-dom';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarIndicator,
  AvatarStatus,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TagItem {
  label: string;
  variant: 'info' | 'warning' | 'secondary' | 'success' | 'destructive' | 'primary' | 'outline';
}

interface Item2Props {
  userName?: string;
  avatar?: string;
  badgeColor?: 'online' | 'offline' | 'busy' | 'away' | null;
  description?: string;
  link?: string;
  timeDisplay?: string;
  info?: string;
  tags?: TagItem[];
  actionType?: string;
}

export default function Item2({
  userName = 'Leslie Alexander',
  avatar = '300-5.png',
  badgeColor = 'online',
  description = 'added new tags to',
  link = 'Web Redesign 2024',
  timeDisplay = '53 mins ago',
  info = 'ACME',
  tags = [
    { label: 'Client-Request', variant: 'info' },
    { label: 'Figma', variant: 'warning' },
    { label: 'Redesign', variant: 'secondary' },
  ],
}: Item2Props) {
  return (
    <div className="flex grow gap-2.5 px-5">
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

        <div className="flex flex-wrap gap-2.5">
          {tags.map((tag, index) => (
            <Badge key={index} size="sm" variant={tag.variant} appearance="light">
              {tag.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

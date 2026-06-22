import { Heart, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarIndicator,
  AvatarStatus,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Item12Props {
  userName?: string;
  avatar?: string;
  badgeColor?: 'online' | 'offline' | 'busy' | 'away' | null;
  description?: string;
  link?: string;
  timeDisplay?: string;
  info?: string;
  messageTitle?: string;
  messageBody?: string;
  commentCount?: number;
  likeCount?: number;
  actionType?: string;
}

export default function Item12({
  userName = 'Selene Silverleaf',
  avatar = '300-21.png',
  badgeColor = 'online',
  description = 'created message to',
  link = 'SiteSculpt',
  timeDisplay = '4 days ago',
  info = 'Manager',
  messageTitle = 'Dashboards',
  messageBody = 'Hello everyone, question regarding the preparation of new dashboards. The update is coming soon, when will the new themes be ready?',
  commentCount = 26,
  likeCount = 13,
}: Item12Props) {
  return (
    <div className="flex grow gap-2.5 px-5 py-3.5">
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
            <span className="text-secondary-foreground"> project </span>
          </div>
          <span className="flex items-center text-xs font-medium text-muted-foreground">
            {timeDisplay}
            <span className="rounded-full size-1 bg-mono/30 mx-1.5"></span>
            {info}
          </span>
        </div>

        <Card className="shadow-none flex flex-col gap-2.5 p-3.5 rounded-lg">
          <div className="font-semibold text-mono text-sm">{messageTitle}</div>
          <p className="font-medium text-secondary-foreground text-sm mb-1 leading-5">
            {messageBody}
          </p>

          <div className="flex items-center gap-2.5">
            <Badge
              size="sm"
              variant="primary"
              appearance="light"
              className="text-primary me-1 text-sm"
            >
              <Mail /> {commentCount} Comments
            </Badge>
            <Badge
              size="sm"
              variant="outline"
              className="text-muted-foreground me-1 text-sm"
            >
              <Heart /> {likeCount} Likes
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}

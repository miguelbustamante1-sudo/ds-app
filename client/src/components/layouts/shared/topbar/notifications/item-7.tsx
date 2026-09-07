import { AvatarGroup } from '@/components/layouts/shared/common/avatar-group';
import {
  CalendarDays,
  Lock,
  MapPin,
  NotepadText,
  Timer,
  Users,
} from 'lucide-react';
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
import { Card } from '@/components/ui/card';

interface Item7Props {
  userName?: string;
  avatar?: string;
  badgeColor?: 'online' | 'offline' | 'busy' | 'away' | null;
  description?: string;
  timeDisplay?: string;
  info?: string;
  meetingTitle?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingLocation?: string;
  meetingLink?: string;
  projectName?: string;
  teamName?: string;
  attendees?: Array<{ path?: string; fallback?: string; variant?: string }>;
  actionType?: string;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function Item7({
  userName = 'Nova Hawthorne',
  avatar = '300-15.png',
  badgeColor = 'offline',
  description = 'sent you an meeting invation',
  timeDisplay = '2 days ago',
  info = 'Dev Team',
  meetingTitle = 'Peparation for Release',
  meetingDate = '22 April 2024',
  meetingTime = '12:00 PM - 14:00 PM',
  meetingLocation = 'Online',
  meetingLink = 'Zoom Meeting',
  projectName = 'Project',
  teamName = 'DigitalDream',
  attendees = [
    { path: '/media/avatars/300-4.png' },
    { path: '/media/avatars/300-1.png' },
    { path: '/media/avatars/300-2.png' },
    { fallback: '+3', variant: 'text-white size-6 ring-background bg-green-500' },
  ],
  actionType,
  onAccept,
  onDecline,
}: Item7Props) {
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
          </div>
          <span className="flex items-center text-xs font-medium text-muted-foreground">
            {timeDisplay}
            <span className="rounded-full size-1 bg-mono/30 mx-1.5"></span>
            {info}
          </span>
        </div>

        <Card className="shadow-none gap-1.5 py-2.5 rounded-lg bg-muted/70">
          <div className="flex flex-col gap-2.5 px-2.5 mb-0.5">
            <span className="font-medium text-secondary-foreground text-xs">
              {meetingTitle}
              <Lock size={16} />
            </span>

            <div className="flex items-center gap-2.5">
              <Badge
                size="sm"
                variant="warning"
                appearance="light"
                className="text-yellow-400 me-1"
              >
                <NotepadText /> {projectName}
              </Badge>
              <Badge
                size="sm"
                variant="secondary"
                appearance="light"
                className="text-secondary-foreground me-1"
              >
                <Users /> {teamName}
              </Badge>
            </div>
          </div>

          <div className="border-b border-b-border my-1.5"></div>

          <div className="flex items-center justify-between flex-wrap gap-2.5 px-2.5">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  <CalendarDays
                    size={16}
                    className="text-muted-foreground me-0.5 text-xs"
                  />
                  <span className="font-medium text-muted-foreground text-xs">
                    {meetingDate}
                  </span>
                </div>

                <div className="flex items-center gap-0.5">
                  <Timer size={16} className="text-muted-foreground text-xs" />
                  <span className="font-medium text-muted-foreground text-xs">
                    {meetingTime}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <MapPin size={16} className="text-muted-foreground text-xs" />
                <div className="font-medium text-muted-foreground text-xs">
                  {meetingLocation}
                  <Link
                    to="#"
                    className="hover:text-primary text-primary font-medium"
                  >
                    {meetingLink}
                  </Link>
                </div>
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

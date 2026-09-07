import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarIndicator,
  AvatarStatus,
} from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';

interface Item4Props {
  userName?: string;
  avatar?: string;
  badgeColor?: 'online' | 'offline' | 'busy' | 'away' | null;
  description?: string;
  timeDisplay?: string;
  fileSize?: string;
  fileIcon?: string;
  fileName?: string;
  fileEditedTime?: string;
  actionType?: string;
}

export default function Item4({
  userName = 'Jane Perez',
  avatar = '300-10.png',
  badgeColor = 'offline',
  description = 'invites you to review a file.',
  timeDisplay = '3 hours ago',
  fileSize = '742kb',
  fileIcon = '/media/file-types/pdf.svg',
  fileName = 'Launch_nov24.pptx',
  fileEditedTime = 'Edited 39 mins ago',
}: Item4Props) {
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
            {fileSize}
          </span>
        </div>

        <Card className="shadow-none flex items-center flex-row gap-1.5 p-2.5 rounded-lg bg-muted/70">
          <img
            src={toAbsoluteUrl(fileIcon)}
            className="h-5"
            alt="image"
          />
          <Link
            to="#"
            className="hover:text-primary font-medium text-secondary-foreground text-xs me-1"
          >
            {fileName}
          </Link>
          <span className="font-medium text-muted-foreground text-xs">
            {fileEditedTime}
          </span>
        </Card>
      </div>
    </div>
  );
}

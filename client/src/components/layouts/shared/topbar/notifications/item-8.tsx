import { Download } from 'lucide-react';
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

interface FileAttachment {
  icon: string;
  name: string;
  uploadTime: string;
}

interface Item8Props {
  userName?: string;
  avatar?: string;
  badgeColor?: 'online' | 'offline' | 'busy' | 'away' | null;
  description?: string;
  timeDisplay?: string;
  info?: string;
  files?: FileAttachment[];
  actionType?: string;
}

export default function Item8({
  userName = 'Skylar Frost',
  avatar = '300-12.png',
  badgeColor = 'online',
  description = 'uploaded 2 attachments',
  timeDisplay = '3 days ago',
  info = 'Web Design',
  files = [
    { icon: '/media/file-types/word.svg', name: 'landing-page-ver1.docx', uploadTime: 'Upload 3 days ago' },
    { icon: '/media/file-types/word.svg', name: 'landing-page-ver2.docx', uploadTime: 'Upload 3 days ago' },
  ],
}: Item8Props) {
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

        {files.map((file, index) => (
          <Card key={index} className="shadow-none flex items-center justify-between flex-row gap-1.5 p-2.5 rounded-lg bg-muted/70">
            <div className="flex items-center gap-1.5">
              <img
                src={toAbsoluteUrl(file.icon)}
                className="h-5"
                alt="image"
              />
              <span className="font-medium text-secondary-foreground text-xs me-1">
                {file.name}
              </span>
              <span className="font-medium text-muted-foreground text-xs">
                {file.uploadTime}
              </span>
            </div>
            <Download size={16} className="text-muted-foreground text-md" />
          </Card>
        ))}
      </div>
    </div>
  );
}

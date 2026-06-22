import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarIndicator,
  AvatarStatus,
} from '@/components/ui/avatar';

interface Item11Props {
  userName?: string;
  avatar?: string;
  badgeColor?: 'online' | 'offline' | 'busy' | 'away' | null;
  description?: string;
  timeDisplay?: string;
  info?: string;
  actionType?: string;
}

export default function Item11({
  userName = 'Sistema DS App',
  avatar = '300-12.png',
  badgeColor = 'online',
  description = '',
  timeDisplay = '',
  info = '',
}: Item11Props) {
  const avatarSrc = avatar?.startsWith('http') ? avatar : `/media/avatars/${avatar}`;

  return (
    <div className="flex grow gap-2.5 px-5 py-3.5">
      <Avatar>
        <AvatarImage src={avatarSrc} alt="avatar" />
        <AvatarFallback>DS</AvatarFallback>
        <AvatarIndicator className="-end-1.5 -bottom-1.5">
          <AvatarStatus variant={badgeColor} className="size-2.5" />
        </AvatarIndicator>
      </Avatar>

      <div className="flex flex-col gap-1 grow">
        <div className="text-sm font-medium mb-px">
          <span className="text-mono font-semibold">{userName}</span>
          <span className="text-secondary-foreground"> {description}</span>
        </div>
        <span className="flex items-center text-xs font-medium text-muted-foreground">
          {timeDisplay}
          {info && (
            <>
              <span className="rounded-full size-1 bg-mono/30 mx-1.5"></span>
              {info}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

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

interface IItem18Item {
  image: string;
  title: string;
  id: string;
}
type IItem18Items = Array<IItem18Item>;

interface Item18Props {
  userName?: string;
  avatar?: string;
  badgeColor?: 'online' | 'offline' | 'busy' | 'away' | null;
  description?: string;
  link?: string;
  timeDisplay?: string;
  info?: string;
  works?: IItem18Items;
  actionType?: string;
}

export default function Item18({
  userName = 'Jane Perez',
  avatar = '300-1.png',
  badgeColor = 'online',
  description = 'added 2 new works to',
  link = 'Inspirations 2024',
  timeDisplay = '23 hours ago',
  info = 'Craftwork Design',
  works = [
    {
      image: '6.jpg',
      title: 'Geometric Patterns',
      id: '81023',
    },
    {
      image: '1.jpg',
      title: 'Artistic Expressions',
      id: '67890',
    },
  ],
}: Item18Props) {
  const items = works;

  const renderItem = (item: IItem18Item, index: number) => {
    return (
      <Card
        key={index}
        className="shadow-none flex flex-col gap-3.5 bg-muted/70 w-40 overflow-hidden"
      >
        <div
          className="bg-cover bg-no-repeat kt-card-rounded-t shrink-0 h-24"
          style={{
            backgroundImage: `url(${toAbsoluteUrl(`/media/images/600x600/${item.image}`)})`,
          }}
        ></div>

        <div className="px-2.5 pb-2">
          <Link
            to="#"
            className="font-medium block text-secondary-foreground hover:text-primary text-xs leading-4 mb-0.5"
          >
            {item.title}
          </Link>
          <div className="text-xs font-medium text-muted-foreground">
            Token ID:
            <span className="text-xs font-medium text-secondary-foreground">
              {item.id}
            </span>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex grow gap-2.5 px-5 py-3.5">
      <Avatar>
        <AvatarImage src={`/media/avatars/${avatar}`} alt="avatar" />
        <AvatarFallback>CH</AvatarFallback>
        <AvatarIndicator className="-end-1.5 -bottom-1.5">
          <AvatarStatus variant={badgeColor} className="size-2.5" />
        </AvatarIndicator>
      </Avatar>

      <div className="flex flex-col gap-2.5 grow">
        <div className="flex flex-col gap-1 mb-1">
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

        <div className="flex items-center gap-2.5">
          {items.map((item, index) => {
            return renderItem(item, index);
          })}
        </div>
      </div>
    </div>
  );
}

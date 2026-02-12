import { Check } from 'lucide-react';

interface Item14Props {
  message?: string;
  timeDisplay?: string;
  actionType?: string;
}

export default function Item14({
  message = 'You have succesfully verified your account',
  timeDisplay = '2 days ago',
}: Item14Props) {
  return (
    <div className="flex items-center grow gap-2.5 px-5">
      <div className="flex items-center justify-center size-8 bg-green-500-soft rounded-full border border-success-transparent">
        <Check className="text-lg text-green-500" />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-secondary-foreground">
          {message}
        </span>
        <span className="font-medium text-muted-foreground text-xs">
          {timeDisplay}
        </span>
      </div>
    </div>
  );
}

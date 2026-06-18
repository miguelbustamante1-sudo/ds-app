import { ArrowLeftRight } from 'lucide-react';

interface ItemHolidaySwapProps {
  userName?: string;
  description: string;
  holidayName?: string;
  originalDate?: string;
  replacementDate?: string;
  timeDisplay?: string;
  actionType?: string;
}

export default function ItemHolidaySwap({
  description,
  holidayName,
  originalDate,
  replacementDate,
  timeDisplay,
}: ItemHolidaySwapProps) {
  return (
    <div className="flex items-start grow gap-2.5 px-5">
      <div className="flex items-center justify-center size-8 bg-amber-500/10 rounded-full border border-amber-500/20 shrink-0 mt-0.5">
        <ArrowLeftRight className="size-4 text-amber-500" />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-secondary-foreground">
          {description}
        </span>
        {holidayName && (
          <span className="text-xs text-muted-foreground">
            {holidayName}
            {originalDate && replacementDate && (
              <> &middot; {originalDate} &rarr; {replacementDate}</>
            )}
          </span>
        )}
        {timeDisplay && (
          <span className="text-xs font-medium text-muted-foreground">
            {timeDisplay}
          </span>
        )}
      </div>
    </div>
  );
}

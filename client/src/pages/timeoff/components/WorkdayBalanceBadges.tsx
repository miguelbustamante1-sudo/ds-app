import { Skeleton } from '@/components/ui/skeleton';

interface WorkdayBalanceBadgesProps {
  vacation: number;
  personalDays: number;
  loading?: boolean;
}

export function WorkdayBalanceBadges({ vacation, personalDays, loading }: WorkdayBalanceBadgesProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-36 rounded-md" />
        <Skeleton className="h-7 w-36 rounded-md" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="rounded-md border bg-card px-3 py-1 text-sm">
        Vacation Days: <span className="font-bold">{vacation}</span>
      </div>
      <div className="rounded-md border bg-card px-3 py-1 text-sm">
        Personal Days: <span className="font-bold">{personalDays}</span>
      </div>
    </div>
  );
}

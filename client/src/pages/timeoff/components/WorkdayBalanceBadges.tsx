import { Skeleton } from '@/components/ui/skeleton';

const fmt = (n: number) => parseFloat(n.toFixed(2));

interface WorkdayBalanceBadgesProps {
  vacation: number;
  personalDays: number;
  loading?: boolean;
  countryIso?: string | null;
  exceptionDaysRemaining?: number; // GT only
}

export function WorkdayBalanceBadges({ vacation, personalDays, loading, countryIso, exceptionDaysRemaining }: WorkdayBalanceBadgesProps) {
  const country = countryIso?.toUpperCase();

  if (loading) {
    const skeletonCount = country === 'MX' ? 1 : country === 'GT' ? 2 : 2;
    return (
      <div className="flex items-center gap-2">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-36 rounded-md" />
        ))}
      </div>
    );
  }

  if (country === 'MX') {
    return (
      <div className="flex items-center gap-2">
        <div className="rounded-md border bg-card px-3 py-1 text-sm">
          Time Off Days: <span className="font-bold">{fmt(vacation)}</span>
        </div>
      </div>
    );
  }

  if (country === 'GT') {
    return (
      <div className="flex items-center gap-2">
        <div className="rounded-md border bg-card px-3 py-1 text-sm">
          Vacation Days: <span className="font-bold">{fmt(vacation)}</span>
        </div>
        <div className="rounded-md border bg-card px-3 py-1 text-sm">
          Exception Days: <span className="font-bold">{fmt(exceptionDaysRemaining ?? 5)}</span>
          <span className="text-muted-foreground"> / 5</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="rounded-md border bg-card px-3 py-1 text-sm">
        Vacation Days: <span className="font-bold">{fmt(vacation)}</span>
      </div>
      <div className="rounded-md border bg-card px-3 py-1 text-sm">
        Personal Days: <span className="font-bold">{fmt(personalDays)}</span>
      </div>
    </div>
  );
}

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ArrowLeftRight, CalendarDays } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { TimeOffHubScopeToggle } from './TimeOffHubScopeToggle';

type TimeOffHubSummaryScope = 'direct' | 'hierarchy';
type TimeOffHubSummaryTab = 'upcoming-timeoff' | 'upcoming-swaps' | 'this-week';

interface TimeOffHubSummaryCounts {
  hasDirectReports: boolean;
  upcomingTimeOff: number;
  upcomingHolidaySwaps: number;
  thisWeek: number;
}

function fetchSummaryCounts(scope: TimeOffHubSummaryScope): Promise<TimeOffHubSummaryCounts> {
  return apiGet<TimeOffHubSummaryCounts>(`/api/time-off-hub/summary?scope=${scope}`);
}

interface SummaryCardProps {
  title: string;
  count: number;
  icon: ReactNode;
  onClick: () => void;
}

function SummaryCard({ title, count, icon, onClick }: SummaryCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${title} — ${count}`}
      className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{title}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{count}</p>
      </CardContent>
    </Card>
  );
}

export function TimeOffHubSummaryCards() {
  const navigate = useNavigate();
  const [scope, setScope] = useState<TimeOffHubSummaryScope>('direct');

  const { data: counts } = useQuery({
    queryKey: ['time-off-hub-summary', scope],
    queryFn: () => fetchSummaryCounts(scope),
    staleTime: 60_000,
  });

  if (!counts?.hasDirectReports) return null;

  function goToTab(tab: TimeOffHubSummaryTab) {
    navigate(`/time-off-hub/summary?tab=${tab}&scope=${scope}`);
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Upcoming Time Off"
          count={counts.upcomingTimeOff}
          icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
          onClick={() => goToTab('upcoming-timeoff')}
        />
        <SummaryCard
          title="Upcoming Holiday Swaps"
          count={counts.upcomingHolidaySwaps}
          icon={<ArrowLeftRight className="h-4 w-4" aria-hidden="true" />}
          onClick={() => goToTab('upcoming-swaps')}
        />
        <SummaryCard
          title="This Week"
          count={counts.thisWeek}
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
          onClick={() => goToTab('this-week')}
        />
      </div>
      <TimeOffHubScopeToggle
        checked={scope === 'hierarchy'}
        onCheckedChange={(hierarchy) => setScope(hierarchy ? 'hierarchy' : 'direct')}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle,
  Clock,
  PlusCircle,
  XCircle,
  CalendarDays,
  Pencil,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { useAuth } from '@/auth/auth-provider';
import { usePermissions } from '@/hooks/usePermissions';
import type { TimeOffActivityLogEntryDTO } from '@shared/dto/TimeOffActivityLog';
import { useTimeOffActivityFeed } from '@/pages/timeoff/activity/hooks/useTimeOffActivityFeed';
import {
  classifyChange,
  type ChangeType,
} from '@/pages/timeoff/activity/utils/classifyChange';
import type { ActivityScope } from '@/pages/timeoff/activity/hooks/useTimeOffActivity';

const EM_DASH = '—';

function fmtDate(val: string | null | undefined): string {
  if (!val) return EM_DASH;
  return formatUTCDate(val);
}

function ChangeIcon({ type }: { type: ChangeType }) {
  switch (type) {
    case 'approved':      return <CheckCircle  className="h-4 w-4 text-uds-system-green-500" />;
    case 'created':       return <PlusCircle   className="h-4 w-4 text-uds-system-blue-500" />;
    case 'declined':      return <XCircle      className="h-4 w-4 text-destructive" />;
    case 'cancelled':     return <XCircle      className="h-4 w-4 text-muted-foreground" />;
    case 'dates-changed': return <CalendarDays className="h-4 w-4 text-uds-system-amber-600" />;
    default:              return <Pencil       className="h-4 w-4 text-muted-foreground" />;
  }
}

function changeTypeLabel(type: ChangeType): string {
  switch (type) {
    case 'created':       return 'Created';
    case 'approved':      return 'Approved';
    case 'declined':      return 'Declined';
    case 'cancelled':     return 'Cancelled';
    case 'dates-changed': return 'Dates Changed';
    default:              return 'Modified';
  }
}

function changeBadgeVariant(type: ChangeType): 'success' | 'secondary' | 'destructive' | 'outline' | 'primary' {
  switch (type) {
    case 'approved':      return 'success';
    case 'created':       return 'primary';
    case 'declined':      return 'destructive';
    case 'cancelled':     return 'secondary';
    default:              return 'outline';
  }
}

function relativeTime(dateStr: string): string {
  try {
    const date = parseUTCDateAsLocal(dateStr);
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 24 * 60 * 60 * 1000) return 'Today';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

interface FeedEntryProps {
  entry: TimeOffActivityLogEntryDTO;
  scope: ActivityScope;
  onClick: (entry: TimeOffActivityLogEntryDTO) => void;
}

function FeedEntry({ entry, scope, onClick }: FeedEntryProps) {
  const type = classifyChange(entry);

  return (
    <button
      className="w-full text-left flex items-start gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
      onClick={() => onClick(entry)}
    >
      <span className="mt-0.5 shrink-0">
        <ChangeIcon type={type} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {scope === 'team' && (
            <span className="text-sm font-medium truncate">{entry.employeeFullName}</span>
          )}
          <Badge variant={changeBadgeVariant(type)} className="text-xs">
            {changeTypeLabel(type)}
          </Badge>
          {(entry.currentCategory ?? entry.newCategory ?? entry.origCategory) && (
            <span className="text-xs font-medium">
              {entry.currentCategory ?? entry.newCategory ?? entry.origCategory}
            </span>
          )}
        </div>
        {(entry.currentStartDate ?? entry.newStartDate) && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {fmtDate(entry.currentStartDate ?? entry.newStartDate)} – {fmtDate(entry.currentEndDate ?? entry.newEndDate)}
          </p>
        )}
        {entry.origStatus !== entry.newStatus && entry.newStatus && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {entry.origStatus ? `${entry.origStatus} → ` : ''}{entry.newStatus}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
        {relativeTime(entry.changeDate)}
      </span>
    </button>
  );
}

export function TimeOffActivityFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canRead } = usePermissions();

  const isSupervisor = canRead('SupervisorTimeOff');
  const [scope, setScope] = useState<ActivityScope>('mine');

  const { data, loading } = useTimeOffActivityFeed(scope);

  const handleEntryClick = (entry: TimeOffActivityLogEntryDTO) => {
    const params = new URLSearchParams({ from: '/timeoff-activity', scope });
    if (scope === 'team' && user?.teamMemberId) {
      params.set('recipientId', String(user.teamMemberId));
    }
    navigate(`/timeoff-detail/${entry.timeOffId}?${params}`);
  };

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Recent Time Off Activity</CardTitle>
          </div>
          <button
            className="flex items-center gap-1 text-sm text-primary hover:underline"
            onClick={() => navigate(`/timeoff-activity?scope=${scope}`)}
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {isSupervisor && (
          <Tabs value={scope} onValueChange={(v) => setScope(v as ActivityScope)} className="mb-3">
            <TabsList variant="line">
              <TabsTrigger value="mine">Mine</TabsTrigger>
              <TabsTrigger value="team">My Team</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {!loading && data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No recent activity found.
          </p>
        )}
        {!loading && data.length > 0 && (
          <div className="space-y-1">
            {data.map((entry) => (
              <FeedEntry
                key={entry.changeLogId}
                entry={entry}
                scope={scope}
                onClick={handleEntryClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

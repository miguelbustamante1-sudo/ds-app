import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, Link2, User } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { getStatusBadgeProps } from '@/lib/badge-utils';
import { useToast } from '@/hooks/use-toast';
import { useExceptionTimeOffDetail } from '@/hooks/useExceptionTimeOff';
import { ChangeLogDiff } from '@/components/changelog/ChangeLogDiff';
import { deriveActionBadge } from '@/lib/changelog/deriveActionBadge';
import { useCategoryNameMap, useStatusNameMap } from '@/hooks/useTimeOffLookups';
import { RelateSplitDialog } from '../components/RelateSplitDialog';
import {
  buildTimeOffFieldMap,
  TIME_OFF_ACTIVE_KEY,
  TIME_OFF_STATUS_KEY,
  TIME_OFF_APPROVED_STATUS_IDS,
  TIME_OFF_REJECTED_STATUS_IDS,
} from '@/pages/timeoff/changelog/timeOffFieldMap';

const SPLIT_STATUS_ID = 6;

export function TimeOffExceptionDetailPage() {
  const { timeOffId: timeOffIdParam } = useParams<{ timeOffId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { detail, loading, error, loadDetail } = useExceptionTimeOffDetail({
    onError: (message) => toast({ title: 'Error', description: message, variant: 'destructive' }),
  });
  const [relateDialogOpen, setRelateDialogOpen] = useState(false);

  const timeOffId = timeOffIdParam ? parseInt(timeOffIdParam, 10) : null;

  useEffect(() => {
    if (timeOffId && !isNaN(timeOffId)) {
      loadDetail(timeOffId);
    }
  }, [timeOffId]);

  const categoryNameMap = useCategoryNameMap();
  const statusNameMap = useStatusNameMap();
  const timeOffFieldMap = buildTimeOffFieldMap(categoryNameMap, statusNameMap);

  const handleBack = () => navigate('/timeoff-exception');

  if (loading && !detail) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error === 404) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Time Off Not Found</ToolbarPageTitle>
            <ToolbarDescription>The time-off request you're looking for doesn't exist.</ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6">
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Error</ToolbarPageTitle>
            <ToolbarDescription>Something went wrong loading this time-off request.</ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6">
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const statusBadge = getStatusBadgeProps(detail.statusId);

  const allChangeLogs = [
    ...(detail.creationComment
      ? [{
          changeLogId: -1,
          changeLogComment: detail.creationComment,
          changeLogCreatedBy: null,
          changeLogCreatedDate: null,
          createdByUserName: null,
          changeLogOldValues: null,
          changeLogNewValues: null,
        }]
      : []),
    ...detail.changeLogs,
  ];

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <Button onClick={handleBack} variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <ToolbarPageTitle>{`Time Off Request #${detail.timeOffId}`}</ToolbarPageTitle>
              <ToolbarDescription>Requested by {detail.teamMemberName}</ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4" />
              Request Details
            </CardTitle>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Category</dt>
                <dd className="text-sm mt-1">{detail.categoryName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                <dd className="text-sm mt-1">{formatUTCDate(detail.timeOffStartDate)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">End Date</dt>
                <dd className="text-sm mt-1">{formatUTCDate(detail.timeOffEndDate)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Days</dt>
                <dd className="text-sm mt-1 flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {detail.timeOffDays} day{detail.timeOffDays !== 1 ? 's' : ''}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Status
              </CardTitle>
              {detail.timeOffDays === 15 && detail.statusId !== SPLIT_STATUS_ID && detail.timeOffOriginalId === null && detail.teamMemberId !== null && (
                <Button size="sm" variant="outline" onClick={() => setRelateDialogOpen(true)}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Relate to Split
                </Button>
              )}
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Team Member</dt>
                <dd className="text-sm mt-1">{detail.teamMemberName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Current Status</dt>
                <dd className="mt-1">
                  <Badge variant={statusBadge.variant} className={statusBadge.className}>
                    {detail.statusName}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {allChangeLogs.length > 0 && (
          <Card className="md:col-span-2">
            <CardContent>
              <CardTitle className="mb-4">Changelog</CardTitle>
              <div className="space-y-4">
                {allChangeLogs.map((log) => (
                  <div
                    key={String(log.changeLogId)}
                    className="flex gap-3 border-l-2 border-muted pl-4 py-1"
                  >
                    <ChangeLogDiff
                      action={deriveActionBadge({
                        oldValues: log.changeLogOldValues,
                        newValues: log.changeLogNewValues,
                        activeKey: TIME_OFF_ACTIVE_KEY,
                        statusKey: TIME_OFF_STATUS_KEY,
                        approvedStatusIds: TIME_OFF_APPROVED_STATUS_IDS,
                        rejectedStatusIds: TIME_OFF_REJECTED_STATUS_IDS,
                      })}
                      oldValues={log.changeLogOldValues}
                      newValues={log.changeLogNewValues}
                      fieldMap={timeOffFieldMap}
                      comment={log.changeLogComment}
                      createdByUserName={log.createdByUserName ?? null}
                      createdDate={log.changeLogCreatedDate}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {detail.teamMemberId !== null && (
        <RelateSplitDialog
          open={relateDialogOpen}
          onOpenChange={setRelateDialogOpen}
          parentId={detail.timeOffId}
          teamMemberId={detail.teamMemberId}
          onSuccess={() => timeOffId && loadDetail(timeOffId)}
        />
      )}
    </div>
  );
}

import { useEffect } from 'react';
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
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { getStatusBadgeProps } from '@/lib/badge-utils';
import { useToast } from '@/hooks/use-toast';
import { useExceptionTimeOffDetail } from '@/hooks/useExceptionTimeOff';

export function TimeOffExceptionDetailPage() {
  const { timeOffId: timeOffIdParam } = useParams<{ timeOffId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { detail, loading, error, loadDetail } = useExceptionTimeOffDetail({
    onError: (message) => toast({ title: 'Error', description: message, variant: 'destructive' }),
  });

  const timeOffId = timeOffIdParam ? parseInt(timeOffIdParam, 10) : null;

  useEffect(() => {
    if (timeOffId && !isNaN(timeOffId)) {
      loadDetail(timeOffId);
    }
  }, [timeOffId]);

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
            <CardTitle className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4" />
              Status
            </CardTitle>
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
                    <div className="flex-1">
                      <p className="text-sm">{log.changeLogComment}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {log.createdByUserName && <span>{log.createdByUserName}</span>}
                        {log.changeLogCreatedDate && (
                          <>
                            {log.createdByUserName && (
                              <span className="rounded-full size-1 bg-muted-foreground/50" />
                            )}
                            <span>{formatUTCDate(log.changeLogCreatedDate, 'dd-MMM-yyyy HH:mm')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

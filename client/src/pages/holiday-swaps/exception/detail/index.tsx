// client/src/pages/holiday-swaps/exception/detail/index.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
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
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { getStatusBadgeProps } from '@/lib/badge-utils';
import { useToast } from '@/hooks/use-toast';
import { ChangeLogDiff } from '@/components/changelog/ChangeLogDiff';
import { deriveActionBadge } from '@/lib/changelog/deriveActionBadge';
import { useHolidayNameMap } from '@/hooks/useHolidayLookups';
import { useStatusNameMap } from '@/hooks/useTimeOffLookups';
import {
  buildHolidaySwapFieldMap,
  HOLIDAY_SWAP_ACTIVE_KEY,
  HOLIDAY_SWAP_STATUS_KEY,
  HOLIDAY_SWAP_APPROVED_STATUS_IDS,
  HOLIDAY_SWAP_REJECTED_STATUS_IDS,
} from '@/pages/holiday-swaps/changelog/holidaySwapFieldMap';
import { useExceptionHolidaySwapDetail } from '../hooks/useExceptionHolidaySwapDetail';
import { CancelSwapDialog } from '../../supervisor/components/CancelSwapDialog';
import { useExceptionSwapOperations } from '../hooks/useExceptionSwapOperations';

const STATUS_ID_ACKNOWLEDGED = 2;
const STATUS_ID_REJECTED = 5;

export function HolidaySwapExceptionDetailPage() {
  const { swapId: swapIdParam } = useParams<{ swapId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const actingAsUserIdParam = searchParams.get('actingAsUserId');
  const actingAsUserId = actingAsUserIdParam ? parseInt(actingAsUserIdParam, 10) : null;

  const { detail, history, loading, error, load } = useExceptionHolidaySwapDetail({
    onError: (message) => toast({ title: 'Error', description: message, variant: 'destructive' }),
  });

  const swapId = swapIdParam ? parseInt(swapIdParam, 10) : null;

  useEffect(() => {
    if (swapId && !isNaN(swapId)) {
      load(swapId);
    }
  }, [swapId, load]);

  const holidayNameMap = useHolidayNameMap();
  const statusNameMap = useStatusNameMap();
  const holidaySwapFieldMap = buildHolidaySwapFieldMap(holidayNameMap, statusNameMap);

  const operationsHook = useExceptionSwapOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (message) => toast({ title: 'Error', description: message, variant: 'destructive' }),
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const refresh = () => {
    if (swapId) load(swapId);
  };

  const handleApprove = async () => {
    if (!actingAsUserId || !detail) return;
    await operationsHook.reviewSwap(detail.holidaySwapId, { statusId: STATUS_ID_ACKNOWLEDGED }, actingAsUserId);
    refresh();
  };

  const handleReject = async () => {
    if (!actingAsUserId || !detail) return;
    await operationsHook.reviewSwap(detail.holidaySwapId, { statusId: STATUS_ID_REJECTED }, actingAsUserId);
    refresh();
  };

  const handleConfirmCancel = async (swapIdArg: number, comment: string) => {
    if (!actingAsUserId) return;
    await operationsHook.cancelSwap(swapIdArg, actingAsUserId, { comment });
    refresh();
  };

  const handleBack = () => navigate('/holiday-swap-exception');

  if (loading || !detail) {
    return (
      <div className="container">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <p className="text-sm text-destructive">Failed to load this holiday swap.</p>
        <Button variant="ghost" onClick={handleBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Exception Swaps
        </Button>
      </div>
    );
  }

  const statusBadge = getStatusBadgeProps(detail.statusId);

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <Button onClick={handleBack} variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <ToolbarPageTitle>{`Holiday Swap #${detail.holidaySwapId}`}</ToolbarPageTitle>
              <ToolbarDescription>BSA exception view</ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4" />
              Swap Details
            </CardTitle>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Holiday</dt>
                <dd className="text-sm mt-1">{detail.holidayName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Holiday Date</dt>
                <dd className="text-sm mt-1">{formatUTCDate(detail.originalDate)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Replacement Date</dt>
                <dd className="text-sm mt-1">{formatUTCDate(detail.replacementDate)}</dd>
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
      </div>

      {actingAsUserId && (
        <Card className="mt-6">
          <CardContent>
            <CardTitle className="mb-4">Actions</CardTitle>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleApprove} disabled={operationsHook.loading}>
                Approve
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={operationsHook.loading}>
                Reject
              </Button>
              <Button variant="outline" onClick={() => setCancelDialogOpen(true)} disabled={operationsHook.loading}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <CancelSwapDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        swap={detail}
        loading={operationsHook.loading}
        onConfirm={handleConfirmCancel}
      />

      {history.length > 0 && (
        <Card className="mt-6">
          <CardContent>
            <CardTitle className="mb-4">History</CardTitle>
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="flex gap-3 border-l-2 border-muted pl-4 py-1">
                  <ChangeLogDiff
                    action={deriveActionBadge({
                      oldValues: entry.oldValues,
                      newValues: entry.newValues,
                      activeKey: HOLIDAY_SWAP_ACTIVE_KEY,
                      statusKey: HOLIDAY_SWAP_STATUS_KEY,
                      approvedStatusIds: HOLIDAY_SWAP_APPROVED_STATUS_IDS,
                      rejectedStatusIds: HOLIDAY_SWAP_REJECTED_STATUS_IDS,
                    })}
                    oldValues={entry.oldValues}
                    newValues={entry.newValues}
                    fieldMap={holidaySwapFieldMap}
                    comment={entry.comment ?? ''}
                    createdByUserName={entry.createdBy}
                    createdDate={entry.createdAt}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

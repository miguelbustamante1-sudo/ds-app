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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Calendar, User, CheckCircle, XCircle, Ban } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { getStatusBadgeProps } from '@/lib/badge-utils';
import { useToast } from '@/hooks/use-toast';
import { useHolidaySwapDetail } from '../hooks/useHolidaySwapDetail';

// Status IDs are seed/DB data shared with tbl_to_statuses
const STATUS_ID_ACKNOWLEDGED = 2; // approve action
const STATUS_ID_REJECTED = 5;     // reject action

export function HolidaySwapDetailPage() {
  const { swapId: swapIdParam } = useParams<{ swapId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { detail, loading, error, loadDetail, cancelSwap, reviewSwap } = useHolidaySwapDetail({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (message) => toast({ title: 'Error', description: message, variant: 'destructive' }),
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  const swapId = swapIdParam ? parseInt(swapIdParam, 10) : null;

  useEffect(() => {
    if (swapId && !isNaN(swapId)) {
      loadDetail(swapId);
    }
  }, [swapId]);

  const handleBack = () => {
    const from = searchParams.get('from');
    navigate(from ?? '/holiday-swaps');
  };

  const handleDialogClose = (setter: (open: boolean) => void) => {
    if (!actionLoading) {
      setComment('');
      setCommentError(null);
      setter(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!swapId) return;
    try {
      setActionLoading(true);
      setCommentError(null);
      await cancelSwap(swapId, comment.trim() || undefined);
      setComment('');
      setCancelDialogOpen(false);
      await loadDetail(swapId);
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!swapId) return;
    try {
      setActionLoading(true);
      await reviewSwap(swapId, STATUS_ID_ACKNOWLEDGED);
      await loadDetail(swapId);
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!swapId) return;
    if (!comment.trim()) {
      setCommentError('A reason is required to reject');
      return;
    }
    try {
      setActionLoading(true);
      setCommentError(null);
      await reviewSwap(swapId, STATUS_ID_REJECTED, comment.trim());
      setComment('');
      setRejectDialogOpen(false);
      await loadDetail(swapId);
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
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
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (error === 404) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Swap Not Found</ToolbarPageTitle>
            <ToolbarDescription>The holiday swap you're looking for doesn't exist.</ToolbarDescription>
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

  if (error === 403) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Access Denied</ToolbarPageTitle>
            <ToolbarDescription>You don't have permission to view this holiday swap.</ToolbarDescription>
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
            <ToolbarDescription>Something went wrong loading this holiday swap.</ToolbarDescription>
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

  const statusBadge = getStatusBadgeProps(detail.statusId, 'outline');
  const canCancel = detail.availableActions.includes('cancel');
  const canApprove = detail.availableActions.includes('approve');
  const canReject = detail.availableActions.includes('reject');
  const hasActions = canCancel || canApprove || canReject;

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
              <ToolbarDescription>{detail.teamMemberName}</ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Swap Details */}
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
              {detail.createdAt && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Requested</dt>
                  <dd className="text-sm mt-1">{formatUTCDate(detail.createdAt)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Status */}
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
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Your Role</dt>
                <dd className="text-sm mt-1 capitalize">{detail.role}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Actions */}
        {hasActions && (
          <Card className="md:col-span-2">
            <CardContent>
              <CardTitle className="mb-4">Actions</CardTitle>
              <div className="flex flex-wrap gap-3">
                {canApprove && (
                  <Button onClick={handleApprove} disabled={actionLoading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </Button>
                )}
                {canReject && (
                  <Button
                    variant="destructive"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="outline"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={() => handleDialogClose(setCancelDialogOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Holiday Swap</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this holiday swap request?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="cancel-comment">Reason (optional)</Label>
            <Textarea
              id="cancel-comment"
              placeholder="Reason for cancellation..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              disabled={actionLoading}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleDialogClose(setCancelDialogOpen)}
              disabled={actionLoading}
            >
              Keep Swap
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={actionLoading}>
              {actionLoading ? 'Cancelling...' : 'Cancel Swap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={() => handleDialogClose(setRejectDialogOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Holiday Swap</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this holiday swap request?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="reject-comment">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-comment"
              placeholder="Please explain why you are rejecting this request..."
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (commentError) setCommentError(null);
              }}
              rows={3}
              disabled={actionLoading}
            />
            {commentError && <p className="text-sm text-destructive">{commentError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleDialogClose(setRejectDialogOpen)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={actionLoading || !comment.trim()}
            >
              {actionLoading ? 'Rejecting...' : 'Reject Swap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

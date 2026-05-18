import { useEffect, useState } from 'react';
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
import { Calendar, Clock, User, Ban, CheckCircle, XCircle, Zap } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTimeOffDetail } from '@/hooks/useTimeOffDetail';

type StatusVariant = 'primary' | 'secondary' | 'destructive' | 'outline';

function getStatusBadge(statusId: number | null): { variant: StatusVariant; className?: string } {
  switch (statusId) {
    case 1:
      return { variant: 'outline', className: 'border-yellow-500 text-yellow-700 bg-yellow-50' };
    case 2:
      return { variant: 'outline', className: 'border-green-500 text-green-700 bg-green-50' };
    case 4:
      return { variant: 'secondary' };
    case 5:
      return { variant: 'destructive' };
    default:
      return { variant: 'primary' };
  }
}

interface TimeOffDetailPanelProps {
  timeOffId: number;
  onActionComplete?: () => void;
}

export function TimeOffDetailPanel({ timeOffId, onActionComplete }: TimeOffDetailPanelProps) {
  const { toast } = useToast();
  const { detail, loading, loadDetail, cancelTimeOff, supervisorApproveTimeOff, supervisorRejectTimeOff } = useTimeOffDetail({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (message) => toast({ title: 'Error', description: message, variant: 'destructive' }),
  });

  const [actionLoading, setActionLoading] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelComment, setCancelComment] = useState('');
  const [cancelCommentError, setCancelCommentError] = useState<string | null>(null);

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [approveCommentError, setApproveCommentError] = useState<string | null>(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectCommentError, setRejectCommentError] = useState<string | null>(null);

  useEffect(() => {
    loadDetail(timeOffId);
  }, [timeOffId]);

  const handleCancelConfirm = async () => {
    if (!cancelComment.trim()) {
      setCancelCommentError('A comment explaining the reason is required');
      return;
    }
    try {
      setActionLoading(true);
      setCancelCommentError(null);
      await cancelTimeOff(timeOffId, cancelComment.trim());
      setCancelComment('');
      setCancelDialogOpen(false);
      await loadDetail(timeOffId);
      onActionComplete?.();
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDialogClose = () => {
    if (!actionLoading) {
      setCancelComment('');
      setCancelCommentError(null);
      setCancelDialogOpen(false);
    }
  };

  const handleApproveConfirm = async () => {
    if (!approveComment.trim()) {
      setApproveCommentError('A comment explaining the reason is required');
      return;
    }
    try {
      setActionLoading(true);
      setApproveCommentError(null);
      await supervisorApproveTimeOff(timeOffId, approveComment.trim());
      setApproveComment('');
      setApproveDialogOpen(false);
      await loadDetail(timeOffId);
      onActionComplete?.();
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveDialogClose = () => {
    if (!actionLoading) {
      setApproveComment('');
      setApproveCommentError(null);
      setApproveDialogOpen(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectComment.trim()) {
      setRejectCommentError('A comment explaining the reason is required');
      return;
    }
    try {
      setActionLoading(true);
      setRejectCommentError(null);
      await supervisorRejectTimeOff(timeOffId, rejectComment.trim());
      setRejectComment('');
      setRejectDialogOpen(false);
      await loadDetail(timeOffId);
      onActionComplete?.();
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDialogClose = () => {
    if (!actionLoading) {
      setRejectComment('');
      setRejectCommentError(null);
      setRejectDialogOpen(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!detail) return null;

  const statusBadge = getStatusBadge(detail.statusId);
  const canApprove = detail.availableActions.includes('supervisor_approve');
  const canReject = detail.availableActions.includes('supervisor_reject');
  const canCancel = detail.availableActions.includes('cancel');
  const hasActions = canApprove || canReject || canCancel;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Request Details */}
        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 text-base mb-4">
              <Calendar className="h-4 w-4" />
              Request Details
            </CardTitle>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Category</dt>
                <dd className="text-sm mt-0.5">{detail.categoryName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Start Date</dt>
                <dd className="text-sm mt-0.5">{formatUTCDate(detail.timeOffStartDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">End Date</dt>
                <dd className="text-sm mt-0.5">{formatUTCDate(detail.timeOffEndDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Days</dt>
                <dd className="text-sm mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {detail.timeOffDays} day{detail.timeOffDays !== 1 ? 's' : ''}
                </dd>
              </div>
              {detail.creationComment && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Comment</dt>
                  <dd className="text-sm mt-0.5 text-muted-foreground">{detail.creationComment}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 text-base mb-4">
              <User className="h-4 w-4" />
              Status
            </CardTitle>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Team Member</dt>
                <dd className="text-sm mt-0.5">{detail.teamMemberName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Current Status</dt>
                <dd className="mt-0.5">
                  <Badge variant={statusBadge.variant} className={statusBadge.className}>
                    {detail.statusName}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 text-base mb-4">
              <Zap className="h-4 w-4" />
              Actions
            </CardTitle>
            {hasActions ? (
              <div className="flex flex-col gap-2">
                {canApprove && (
                  <Button
                    size="sm"
                    onClick={() => setApproveDialogOpen(true)}
                    disabled={actionLoading}
                    className="justify-start"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                {canReject && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={actionLoading}
                    className="justify-start"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={actionLoading}
                    className="justify-start"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel Request
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No actions available for this request.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Changelog */}
      {detail.changeLogs.length > 0 && (
        <Card>
          <CardContent>
            <CardTitle className="text-base mb-4">Changelog</CardTitle>
            <div className="space-y-3">
              {detail.changeLogs.map((log) => (
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
                          <span>{formatUTCDate(log.changeLogCreatedDate, 'MMM dd, yyyy HH:mm')}</span>
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

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={handleCancelDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Time Off Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this time-off request?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="cancel-comment-panel">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-comment-panel"
              placeholder="Please explain why you are cancelling this request..."
              value={cancelComment}
              onChange={(e) => {
                setCancelComment(e.target.value);
                if (cancelCommentError) setCancelCommentError(null);
              }}
              rows={3}
              disabled={actionLoading}
            />
            {cancelCommentError && <p className="text-sm text-destructive">{cancelCommentError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelDialogClose} disabled={actionLoading}>
              Keep Request
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={actionLoading || !cancelComment.trim()}
            >
              {actionLoading ? 'Cancelling...' : 'Cancel Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={handleApproveDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Time Off Request</DialogTitle>
            <DialogDescription>
              Approve this time-off request for {detail.teamMemberName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="approve-comment-panel">
              Comment <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="approve-comment-panel"
              placeholder="Add a comment..."
              value={approveComment}
              onChange={(e) => {
                setApproveComment(e.target.value);
                if (approveCommentError) setApproveCommentError(null);
              }}
              rows={3}
              disabled={actionLoading}
            />
            {approveCommentError && <p className="text-sm text-destructive">{approveCommentError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleApproveDialogClose} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleApproveConfirm} disabled={actionLoading || !approveComment.trim()}>
              {actionLoading ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={handleRejectDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Time Off Request</DialogTitle>
            <DialogDescription>
              Reject this time-off request for {detail.teamMemberName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="reject-comment-panel">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-comment-panel"
              placeholder="Please explain why you are rejecting this request..."
              value={rejectComment}
              onChange={(e) => {
                setRejectComment(e.target.value);
                if (rejectCommentError) setRejectCommentError(null);
              }}
              rows={3}
              disabled={actionLoading}
            />
            {rejectCommentError && <p className="text-sm text-destructive">{rejectCommentError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleRejectDialogClose} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={actionLoading || !rejectComment.trim()}
            >
              {actionLoading ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

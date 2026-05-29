import { useEffect, useState, useMemo } from 'react';
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
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Ban,
} from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { getStatusBadgeProps } from '@/lib/badge-utils';
import { useToast } from '@/hooks/use-toast';
import { useTimeOffDetail } from '@/hooks/useTimeOffDetail';

export function TimeOffDetailPage() {
  const { timeOffId: timeOffIdParam } = useParams<{ timeOffId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const recipientId = useMemo(() => {
    const param = searchParams.get('recipientId');
    return param ? parseInt(param, 10) : null;
  }, [searchParams]);

  const {
    detail,
    loading,
    error,
    loadDetail,
    acknowledgeTimeOff,
    declineTimeOff,
    cancelTimeOff,
    supervisorApproveTimeOff,
    supervisorRejectTimeOff,
  } = useTimeOffDetail({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (message) => toast({ title: 'Error', description: message, variant: 'destructive' }),
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  const timeOffId = timeOffIdParam ? parseInt(timeOffIdParam, 10) : null;

  useEffect(() => {
    if (timeOffId && !isNaN(timeOffId)) {
      loadDetail(timeOffId);
    }
  }, [timeOffId]);

  const handleBack = () => {
    const from = searchParams.get('from');
    if (from) {
      navigate(from);
    } else if (detail?.role === 'supervisor') {
      navigate('/supervisor-time-off');
    } else {
      navigate('/my-time-off');
    }
  };

  const handleAcknowledge = async () => {
    if (!timeOffId || !recipientId) return;
    try {
      setActionLoading(true);
      await acknowledgeTimeOff(timeOffId, recipientId);
      await loadDetail(timeOffId);
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineConfirm = async () => {
    if (!timeOffId || !recipientId) return;
    if (!comment.trim()) {
      setCommentError('A comment explaining the reason is required');
      return;
    }
    try {
      setActionLoading(true);
      setCommentError(null);
      await declineTimeOff(timeOffId, recipientId, comment.trim());
      setComment('');
      setDeclineDialogOpen(false);
      await loadDetail(timeOffId);
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!timeOffId) return;
    if (!comment.trim()) {
      setCommentError('A comment explaining the reason is required');
      return;
    }
    try {
      setActionLoading(true);
      setCommentError(null);
      await cancelTimeOff(timeOffId, comment.trim());
      setComment('');
      setCancelDialogOpen(false);
      await loadDetail(timeOffId);
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveConfirm = async () => {
    if (!timeOffId) return;
    if (!comment.trim()) {
      setCommentError('A comment is required');
      return;
    }
    try {
      setActionLoading(true);
      setCommentError(null);
      await supervisorApproveTimeOff(timeOffId, comment.trim());
      setComment('');
      setApproveDialogOpen(false);
      await loadDetail(timeOffId);
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!timeOffId) return;
    if (!comment.trim()) {
      setCommentError('A comment explaining the reason is required');
      return;
    }
    try {
      setActionLoading(true);
      setCommentError(null);
      await supervisorRejectTimeOff(timeOffId, comment.trim());
      setComment('');
      setRejectDialogOpen(false);
      await loadDetail(timeOffId);
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleDialogClose = (setter: (open: boolean) => void) => {
    if (!actionLoading) {
      setComment('');
      setCommentError(null);
      setter(false);
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
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // 404 state
  if (error === 404) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Time Off Not Found</ToolbarPageTitle>
            <ToolbarDescription>
              The time-off request you're looking for doesn't exist.
            </ToolbarDescription>
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

  // 403 state
  if (error === 403) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Access Denied</ToolbarPageTitle>
            <ToolbarDescription>
              You don't have permission to view this time-off request.
            </ToolbarDescription>
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

  // Error state
  if (error && !detail) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Error</ToolbarPageTitle>
            <ToolbarDescription>
              Something went wrong loading this time-off request.
            </ToolbarDescription>
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
  const canAcknowledge = detail.availableActions.includes('acknowledge') && recipientId !== null;
  const canDecline = detail.availableActions.includes('decline') && recipientId !== null;
  const canCancel = detail.availableActions.includes('cancel');
  const canSupervisorApprove = detail.availableActions.includes('supervisor_approve');
  const canSupervisorReject = detail.availableActions.includes('supervisor_reject');

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
              <ToolbarDescription>
                Requested by {detail.teamMemberName}
              </ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Request Details */}
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

        {/* Status & Team Member */}
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
        {(canAcknowledge || canDecline || canCancel || canSupervisorApprove || canSupervisorReject) && (
          <Card className="md:col-span-2">
            <CardContent>
              <CardTitle className="mb-4">Actions</CardTitle>
              <div className="flex flex-wrap gap-3">
                {canSupervisorApprove && (
                  <Button
                    onClick={() => setApproveDialogOpen(true)}
                    disabled={actionLoading}
                    className="bg-uds-system-green-600 hover:bg-uds-system-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                {canSupervisorReject && (
                  <Button
                    variant="destructive"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Deny
                  </Button>
                )}
                {canAcknowledge && (
                  <Button
                    onClick={handleAcknowledge}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {actionLoading ? 'Processing...' : 'Acknowledge'}
                  </Button>
                )}
                {canDecline && (
                  <Button
                    variant="destructive"
                    onClick={() => setDeclineDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
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

        {/* Changelog */}
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
                        {log.createdByUserName && (
                          <span>{log.createdByUserName}</span>
                        )}
                        {log.changeLogCreatedDate && (
                          <>
                            {log.createdByUserName && (
                              <span className="rounded-full size-1 bg-muted-foreground/50" />
                            )}
                            <span>
                              {formatUTCDate(log.changeLogCreatedDate, 'MMM dd, yyyy HH:mm')}
                            </span>
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

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={() => handleDialogClose(setApproveDialogOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Time Off Request</DialogTitle>
            <DialogDescription>
              Please add a comment for this approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="approve-comment">
              Comment <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="approve-comment"
              placeholder="Add a comment..."
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
            <Button variant="outline" onClick={() => handleDialogClose(setApproveDialogOpen)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveConfirm}
              disabled={actionLoading || !comment.trim()}
              className="bg-uds-system-green-600 hover:bg-uds-system-green-700 text-white"
            >
              {actionLoading ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={() => handleDialogClose(setRejectDialogOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deny Time Off Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to deny this time-off request?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="reject-comment">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-comment"
              placeholder="Please explain why you are denying this request..."
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
            <Button variant="outline" onClick={() => handleDialogClose(setRejectDialogOpen)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={actionLoading || !comment.trim()}>
              {actionLoading ? 'Denying...' : 'Deny Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={() => handleDialogClose(setDeclineDialogOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Time Off Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this time-off request?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="decline-comment">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="decline-comment"
              placeholder="Please explain why you are declining this request..."
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
            <Button variant="outline" onClick={() => handleDialogClose(setDeclineDialogOpen)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeclineConfirm} disabled={actionLoading || !comment.trim()}>
              {actionLoading ? 'Declining...' : 'Decline Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={() => handleDialogClose(setCancelDialogOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Time Off Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this time-off request?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="cancel-comment">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-comment"
              placeholder="Please explain why you are cancelling this request..."
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
            <Button variant="outline" onClick={() => handleDialogClose(setCancelDialogOpen)} disabled={actionLoading}>
              Keep Request
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={actionLoading || !comment.trim()}>
              {actionLoading ? 'Cancelling...' : 'Cancel Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

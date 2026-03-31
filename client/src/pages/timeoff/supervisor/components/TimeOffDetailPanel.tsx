import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Calendar, Clock, User, Ban } from 'lucide-react';
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
  const { detail, loading, loadDetail, cancelTimeOff } = useTimeOffDetail({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (message) => toast({ title: 'Error', description: message, variant: 'destructive' }),
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    loadDetail(timeOffId);
  }, [timeOffId]);

  const handleCancelConfirm = async () => {
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
      onActionComplete?.();
    } catch {
      // error handled by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleDialogClose = () => {
    if (!actionLoading) {
      setComment('');
      setCommentError(null);
      setCancelDialogOpen(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!detail) return null;

  const statusBadge = getStatusBadge(detail.statusId);
  const canCancelAction = detail.availableActions.includes('cancel');

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Request Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
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
      </div>

      {/* Actions */}
      {canCancelAction && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
                disabled={actionLoading}
              >
                <Ban className="h-4 w-4 mr-2" />
                Cancel Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changelog */}
      {detail.changeLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Changelog</CardTitle>
          </CardHeader>
          <CardContent>
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
      <Dialog open={cancelDialogOpen} onOpenChange={handleDialogClose}>
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
            <Button variant="outline" onClick={handleDialogClose} disabled={actionLoading}>
              Keep Request
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={actionLoading || !comment.trim()}
            >
              {actionLoading ? 'Cancelling...' : 'Cancel Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

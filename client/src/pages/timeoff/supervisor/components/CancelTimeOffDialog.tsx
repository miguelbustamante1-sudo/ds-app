import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { TimeOffWithDetailsDTO } from '@shared/dto/TimeOff';
import { formatUTCDate } from '@/lib/utils';
import { isSplitSiblingPassed } from '../../utils/splitSiblingStatus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type CancelTimeOffDialogTimeOff = Pick<
  TimeOffWithDetailsDTO,
  'timeOffId' | 'categoryName' | 'timeOffStartDate' | 'timeOffEndDate' | 'statusName'
>;

interface CancelTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOff: CancelTimeOffDialogTimeOff | null;
  sibling?: Pick<TimeOffWithDetailsDTO, 'timeOffId' | 'timeOffEndDate' | 'statusName'> | null;
  onConfirm: (timeOffId: number, comment: string) => Promise<void>;
  loading: boolean;
}

export function CancelTimeOffDialog({
  open,
  onOpenChange,
  timeOff,
  sibling,
  onConfirm,
  loading,
}: CancelTimeOffDialogProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!timeOff) return;

    if (!comment.trim()) {
      setError('A comment explaining the cancellation is required');
      return;
    }

    setError(null);
    await onConfirm(timeOff.timeOffId, comment.trim());
    setComment('');
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!loading) {
      setComment('');
      setError(null);
      onOpenChange(false);
    }
  };

  if (!timeOff) return null;

  const siblingPassed = sibling ? isSplitSiblingPassed(sibling) : false;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Time Off Request</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this time off request?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Time Off Details */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium">{timeOff.categoryName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Start Date:</span>
              <span className="font-medium">
                {formatUTCDate(timeOff.timeOffStartDate)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">End Date:</span>
              <span className="font-medium">
                {formatUTCDate(timeOff.timeOffEndDate)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">{timeOff.statusName}</span>
            </div>
          </div>

          {sibling && siblingPassed && (
            <div className="flex items-start gap-2 rounded-md border border-uds-system-red-200 bg-uds-system-red-50 p-3 text-uds-system-red-700">
              <AlertTriangle className="mt-0.5 shrink-0" size={15} />
              <p className="text-xs">
                Cannot cancel this leg — the other leg of this split has already passed. Edit this leg to reschedule it instead.
              </p>
            </div>
          )}
          {sibling && !siblingPassed && (
            <div className="flex items-start gap-2 rounded-md border border-uds-system-amber-400 bg-uds-system-amber-100 p-3 text-uds-system-amber-700">
              <AlertTriangle className="mt-0.5 shrink-0" size={15} />
              <p className="text-xs">
                This will also cancel the other leg of this split and the parent record.
              </p>
            </div>
          )}

          {/* Comment Input */}
          <div className="space-y-2">
            <Label htmlFor="cancel-comment">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-comment"
              placeholder="Please explain why this time off is being cancelled..."
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError(null);
              }}
              rows={3}
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Keep Request
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !comment.trim() || siblingPassed}
          >
            {loading ? 'Cancelling...' : 'Cancel Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatUTCDate } from '@/lib/utils';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export interface ReviewOverrideTarget {
  swap: HolidaySwapDTO;
  action: 'approve' | 'reject';
}

interface ReviewOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReviewOverrideTarget | null;
  loading: boolean;
  onConfirm: (swapId: number, action: 'approve' | 'reject', comment: string) => Promise<void>;
}

export function ReviewOverrideDialog({
  open,
  onOpenChange,
  target,
  loading,
  onConfirm,
}: ReviewOverrideDialogProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setComment('');
    setError(null);
    onOpenChange(false);
  }

  async function handleConfirm() {
    if (!target) return;
    if (!comment.trim()) {
      setError('A reason is required to override an already-resolved swap');
      return;
    }
    await onConfirm(target.swap.holidaySwapId, target.action, comment.trim());
    handleClose();
  }

  const actionLabel = target?.action === 'approve' ? 'Approve' : 'Reject';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionLabel} Holiday Swap — Override</DialogTitle>
        </DialogHeader>

        {target && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This swap for{' '}
              <span className="font-medium text-foreground">{target.swap.holidayName}</span> (
              {formatUTCDate(target.swap.originalDate)}) with replacement on{' '}
              <span className="font-medium text-foreground">
                {formatUTCDate(target.swap.replacementDate)}
              </span>{' '}
              is currently already{' '}
              <span className="font-medium text-foreground">{target.swap.statusName}</span>.
              {actionLabel === 'Approve' ? ' Approving' : ' Rejecting'} it now will override that
              decision.
            </p>

            <div className="space-y-1.5">
              <Label>
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Why are you overriding the existing decision..."
                rows={3}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={target?.action === 'reject' ? 'destructive' : 'primary'}
            onClick={handleConfirm}
            disabled={loading || !comment.trim()}
          >
            {loading ? 'Saving…' : `${actionLabel} Anyway`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

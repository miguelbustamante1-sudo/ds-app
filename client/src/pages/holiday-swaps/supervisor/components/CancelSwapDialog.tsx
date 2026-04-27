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

interface CancelSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swap: HolidaySwapDTO | null;
  loading: boolean;
  onConfirm: (swapId: number, comment: string) => Promise<void>;
}

export function CancelSwapDialog({
  open,
  onOpenChange,
  swap,
  loading,
  onConfirm,
}: CancelSwapDialogProps) {
  const [comment, setComment] = useState('');

  function handleClose() {
    setComment('');
    onOpenChange(false);
  }

  async function handleConfirm() {
    if (!swap) return;
    await onConfirm(swap.holidaySwapId, comment);
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Holiday Swap</DialogTitle>
        </DialogHeader>

        {swap && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              You are about to cancel the holiday swap for{' '}
              <span className="font-medium text-foreground">{swap.holidayName}</span> (
              {formatUTCDate(swap.originalDate)}) with replacement on{' '}
              <span className="font-medium text-foreground">
                {formatUTCDate(swap.replacementDate)}
              </span>
              .
            </p>

            <div className="space-y-1.5">
              <Label>Comment (optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Reason for cancellation..."
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Keep Swap
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Cancelling…' : 'Cancel Swap'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

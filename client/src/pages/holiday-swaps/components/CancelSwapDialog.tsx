import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCancelSwap } from '../hooks/useCancelSwap';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';
import { formatUTCDate } from '@/lib/utils';

interface CancelSwapDialogProps {
  swap: HolidaySwapDTO | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (swap: HolidaySwapDTO) => void;
}

export function CancelSwapDialog({ swap, open, onClose, onSuccess }: CancelSwapDialogProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { cancelSwap, loading } = useCancelSwap({
    onSuccess: (cancelled) => {
      onSuccess(cancelled);
      handleClose();
    },
    onError: (msg) => setError(msg),
  });

  function handleClose() {
    setComment('');
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (!swap) return;
    setError(null);
    await cancelSwap(swap.holidaySwapId, { comment: comment || undefined });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Holiday Swap</DialogTitle>
          {swap && (
            <DialogDescription>
              You are about to cancel the swap for <strong>{swap.holidayName}</strong> on{' '}
              {formatUTCDate(swap.originalDate)}, with replacement day{' '}
              {formatUTCDate(swap.replacementDate)}.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Comment (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Reason for cancellation…"
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Back
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Cancelling…' : 'Confirm Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

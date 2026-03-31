import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BenchMoveConfirmDialogProps {
  isOpen: boolean;
  teamMemberName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function BenchMoveConfirmDialog({
  isOpen,
  teamMemberName,
  onConfirm,
  onCancel,
  isSubmitting,
}: BenchMoveConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Bench Move</DialogTitle>
          <DialogDescription>
            You are about to bench <strong>{teamMemberName}</strong>. This will update their
            project assignments, supervisor, and allocation. Continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Confirm Bench Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

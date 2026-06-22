import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiDelete } from '@/lib/api';
import type { BulkRemoveAssignmentsDTO } from '@shared/dto';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignmentIds: number[];
  onSuccess: () => void;
}

interface FormData {
  lastBillableDate: string;
}

export function BulkRemoveModal({ open, onOpenChange, assignmentIds, onSuccess }: Props) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  const onSubmit = async (data: FormData) => {
    try {
      await apiDelete<BulkRemoveAssignmentsDTO>('/api/team-member-projects/bulk', {
        assignmentIds,
        lastBillableDate: data.lastBillableDate,
      });
      toast({
        title: 'Success',
        description: `${assignmentIds.length} assignment${assignmentIds.length !== 1 ? 's' : ''} removed.`,
      });
      reset();
      onSuccess();
    } catch {
      toast({ title: 'Error', description: 'Failed to remove assignments.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove from Project</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Removing {assignmentIds.length} assignment{assignmentIds.length !== 1 ? 's' : ''}.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lastBillableDate">
                Last Billable Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastBillableDate"
                type="date"
                {...register('lastBillableDate', { required: 'Last billable date is required' })}
              />
              {errors.lastBillableDate && (
                <p className="text-sm text-destructive">{errors.lastBillableDate.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

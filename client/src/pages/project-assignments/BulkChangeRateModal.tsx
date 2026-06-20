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
import { apiPost } from '@/lib/api';
import type { BulkChangeRateDTO } from '@shared/dto';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignmentIds: number[];
  onSuccess: () => void;
}

interface FormData {
  newBillRate: string;
  newBillRateCurrency: string;
  newOnCallRate: string;
  startDate: string;
}

export function BulkChangeRateModal({ open, onOpenChange, assignmentIds, onSuccess }: Props) {
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
      await apiPost<void, BulkChangeRateDTO>('/api/team-member-projects/bulk-change-rate', {
        assignmentIds,
        newBillRate: Number(data.newBillRate),
        newBillRateCurrency: data.newBillRateCurrency.toUpperCase(),
        newOnCallRate: data.newOnCallRate ? Number(data.newOnCallRate) : null,
        startDate: data.startDate,
      });
      toast({
        title: 'Success',
        description: `Bill rate updated for ${assignmentIds.length} assignment${assignmentIds.length !== 1 ? 's' : ''}.`,
      });
      reset();
      onSuccess();
    } catch {
      toast({ title: 'Error', description: 'Failed to update bill rate.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Bill Rate</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Updating {assignmentIds.length} assignment{assignmentIds.length !== 1 ? 's' : ''}.
            The previous rate will be closed automatically.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newBillRate">
                New Bill Rate <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newBillRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 50.00"
                {...register('newBillRate', {
                  required: 'Bill rate is required',
                  min: { value: 0, message: 'Rate must be 0 or greater' },
                })}
              />
              {errors.newBillRate && (
                <p className="text-sm text-destructive">{errors.newBillRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newBillRateCurrency">
                Currency <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newBillRateCurrency"
                type="text"
                maxLength={3}
                placeholder="USD"
                {...register('newBillRateCurrency', {
                  required: 'Currency is required',
                  maxLength: { value: 3, message: 'Must be 3 characters' },
                  setValueAs: (v: string) => v.toUpperCase(),
                })}
              />
              {errors.newBillRateCurrency && (
                <p className="text-sm text-destructive">{errors.newBillRateCurrency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newOnCallRate">On-Call Rate</Label>
              <Input
                id="newOnCallRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 50.00"
                {...register('newOnCallRate', {
                  min: { value: 0, message: 'On-call rate must be 0 or greater' },
                })}
              />
              {errors.newOnCallRate && (
                <p className="text-sm text-destructive">{errors.newOnCallRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">
                Effective Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate', { required: 'Effective date is required' })}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

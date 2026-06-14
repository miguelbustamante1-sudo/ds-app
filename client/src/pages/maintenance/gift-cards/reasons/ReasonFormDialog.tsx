import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { createReason, updateReason, type GiftCardReasonDTO } from '@/services/giftCardReason';

interface FormData {
  reasonName: string;
}

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
  reason?:      GiftCardReasonDTO | null;
}

export function ReasonFormDialog({ open, onOpenChange, onSuccess, reason }: Props) {
  const { toast } = useToast();
  const isEdit = !!reason;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ defaultValues: { reasonName: '' } });

  useEffect(() => {
    if (!open) return;
    reset({ reasonName: reason?.reasonName ?? '' });
  }, [open, reason, reset]);

  const onSave = async (data: FormData) => {
    try {
      if (isEdit && reason) {
        await updateReason(reason.reasonId, { reasonName: data.reasonName });
        toast({ title: 'Updated', description: `Reason "${data.reasonName}" updated successfully.` });
      } else {
        await createReason({ reasonName: data.reasonName });
        toast({ title: 'Created', description: `Reason "${data.reasonName}" created successfully.` });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : `Failed to ${isEdit ? 'update' : 'create'} reason`;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Reason' : 'Add Reason'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the reason name below.' : 'Fill in the details to create a new reason.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reasonName">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reasonName"
                placeholder="e.g. Performance Recognition"
                {...register('reasonName', { required: 'Name is required' })}
              />
              {errors.reasonName && (
                <p className="text-sm text-destructive">{errors.reasonName.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
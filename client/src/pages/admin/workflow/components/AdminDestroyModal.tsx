import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AdminDestroyModalProps {
  winId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface DestroyFormData {
  reason: string;
}

export function AdminDestroyModal({
  winId,
  open,
  onOpenChange,
  onSuccess,
}: AdminDestroyModalProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<DestroyFormData>({
    defaultValues: { reason: '' },
  });

  const reason = watch('reason');

  useEffect(() => {
    if (open) {
      reset({ reason: '' });
    }
  }, [open, reset]);

  const onSubmit = async (data: DestroyFormData) => {
    try {
      await apiPost(`/api/workflow/instances/${winId}/destroy`, { reason: data.reason });
      toast({ title: 'Success', description: 'Workflow destroyed.' });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to destroy workflow';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Destroy Workflow</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <p className="text-sm text-destructive mb-4">
            ⚠ This will immediately stop the workflow. All remaining tasks will be Voided. This
            action cannot be undone.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="destroy-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="destroy-reason"
              {...register('reason', { required: true })}
              rows={3}
              placeholder="Explain why this workflow is being destroyed..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? 'Processing...' : 'Confirm Destroy'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

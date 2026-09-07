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

interface AdminForceCompleteModalProps {
  winId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ForceCompleteFormData {
  reason: string;
}

export function AdminForceCompleteModal({
  winId,
  open,
  onOpenChange,
  onSuccess,
}: AdminForceCompleteModalProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<ForceCompleteFormData>({
    defaultValues: { reason: '' },
  });

  const reason = watch('reason');

  useEffect(() => {
    if (open) {
      reset({ reason: '' });
    }
  }, [open, reset]);

  const onSubmit = async (data: ForceCompleteFormData) => {
    try {
      await apiPost(`/api/workflow/instances/${winId}/force-complete`, { reason: data.reason });
      toast({ title: 'Success', description: 'Workflow force-completed.' });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to force complete workflow';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Force Complete Workflow</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground mb-4">
            This will mark all remaining tasks as Overridden and complete the workflow. This action
            cannot be undone.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="fc-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="fc-reason"
              {...register('reason', { required: true })}
              rows={3}
              placeholder="Explain why this workflow is being force-completed..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !reason.trim()}>
              {isSubmitting ? 'Processing...' : 'Confirm Force Complete'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

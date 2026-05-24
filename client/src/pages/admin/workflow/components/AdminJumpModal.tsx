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
import { ComboBox } from '@/components/ui/combobox';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { WitAdminTask } from '../types';

interface AdminJumpModalProps {
  winId: string;
  pendingTasks: WitAdminTask[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface JumpFormData {
  targetWitId: string;
  reason: string;
}

export function AdminJumpModal({
  winId,
  pendingTasks,
  open,
  onOpenChange,
  onSuccess,
}: AdminJumpModalProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<JumpFormData>({
    defaultValues: { targetWitId: '', reason: '' },
  });

  const watchedTargetWitId = watch('targetWitId');
  const reason = watch('reason');

  useEffect(() => {
    if (open) {
      reset({ targetWitId: '', reason: '' });
    }
  }, [open, reset]);

  const taskOptions = pendingTasks
    .filter((t) => t.state === 'PENDING')
    .map((t) => ({ value: t.witId, label: `${t.code} — ${t.name}` }));

  const onSubmit = async (data: JumpFormData) => {
    try {
      await apiPost(`/api/workflow/instances/${winId}/jump`, {
        targetWitId: data.targetWitId,
        reason: data.reason,
      });
      toast({ title: 'Success', description: 'Workflow jumped to task.' });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to jump to task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Jump to Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>
              Target Task <span className="text-destructive">*</span>
            </Label>
            <ComboBox
              options={taskOptions}
              value={watchedTargetWitId}
              onValueChange={(value) => setValue('targetWitId', value)}
              placeholder="Select a pending task..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jump-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="jump-reason"
              {...register('reason', { required: true })}
              rows={3}
              placeholder="Explain why this jump is needed..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !watchedTargetWitId || !reason.trim()}
            >
              {isSubmitting ? 'Jumping...' : 'Jump to Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

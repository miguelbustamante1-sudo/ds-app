import { useEffect, useState } from 'react';
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
import type { ComboBoxOption } from '@/components/ui/combobox';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { ActingAsUserDTO } from '@shared/dto/HolidaySwap';
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
  assigneeUserId: string;
}

export function AdminJumpModal({
  winId,
  pendingTasks,
  open,
  onOpenChange,
  onSuccess,
}: AdminJumpModalProps) {
  const { toast } = useToast();
  const [userOptions, setUserOptions] = useState<ComboBoxOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<JumpFormData>({
    defaultValues: { targetWitId: '', reason: '', assigneeUserId: '' },
  });

  const watchedTargetWitId = watch('targetWitId');
  const watchedAssigneeUserId = watch('assigneeUserId');
  const reason = watch('reason');

  useEffect(() => {
    if (open) {
      reset({ targetWitId: '', reason: '', assigneeUserId: '' });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    apiGet<ActingAsUserDTO[]>('/api/workflow/users')
      .then((users) => {
        setUserOptions(
          users.map((u) => ({
            value: u.userId.toString(),
            label: u.workdayId ? `${u.fullName} (${u.workdayId})` : u.fullName,
          })),
        );
      })
      .catch(() => {
        // silently ignore — the ComboBox will just show no options
      });
  }, [open]);

  const taskOptions = pendingTasks
    .filter((t) => t.state === 'PENDING')
    .map((t) => ({ value: t.witId, label: `${t.code} — ${t.name}` }));

  // Admin Jump onto a CONTEXT-assigned task requires an explicit assignee
  // (spec §4.6) — CONTEXT has no resolution algorithm, only a caller-supplied value.
  const selectedTask = pendingTasks.find((t) => t.witId === watchedTargetWitId);
  const requiresAssignee = selectedTask?.assignmentType === 'CONTEXT';

  const onSubmit = async (data: JumpFormData) => {
    try {
      await apiPost(`/api/workflow/instances/${winId}/jump`, {
        targetWitId: data.targetWitId,
        reason: data.reason,
        assigneeUserId: data.assigneeUserId ? parseInt(data.assigneeUserId, 10) : undefined,
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

          {requiresAssignee && (
            <div className="space-y-1.5">
              <Label>
                Assignee <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={userOptions}
                value={watchedAssigneeUserId}
                onValueChange={(value) => setValue('assigneeUserId', value)}
                placeholder="Select the assignee..."
              />
            </div>
          )}

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
              disabled={
                isSubmitting ||
                !watchedTargetWitId ||
                !reason.trim() ||
                (requiresAssignee && !watchedAssigneeUserId)
              }
            >
              {isSubmitting ? 'Jumping...' : 'Jump to Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

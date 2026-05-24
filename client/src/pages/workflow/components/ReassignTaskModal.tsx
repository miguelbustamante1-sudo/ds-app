import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ReassignTaskModalProps {
  witId: string;
  winId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  requireReason: boolean;
}

interface ReassignFormData {
  toUserId: string;
  toRoleId: string;
  reason: string;
}

export function ReassignTaskModal({
  witId,
  winId,
  open,
  onOpenChange,
  onSuccess,
  requireReason,
}: ReassignTaskModalProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReassignFormData>({
    defaultValues: { toUserId: '', toRoleId: '', reason: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ toUserId: '', toRoleId: '', reason: '' });
    }
  }, [open, reset]);

  const onSubmit = async (data: ReassignFormData) => {
    const toUserId = data.toUserId.trim();
    const toRoleId = data.toRoleId.trim();

    if (!toUserId && !toRoleId) {
      setError('toUserId', { message: 'At least one of User ID or Role ID is required' });
      return;
    }

    const payload: { toUserId?: string; toRoleId?: string; reason: string } = {
      reason: data.reason.trim(),
    };
    if (toUserId) payload.toUserId = toUserId;
    if (toRoleId) payload.toRoleId = toRoleId;

    try {
      await apiPost<unknown, typeof payload>(
        `/api/workflow/instances/${winId}/tasks/${witId}/reassign`,
        payload,
      );
      toast({ title: 'Success', description: 'Task reassigned.' });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reassign task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="reassign-user">
              User ID (UUID)
              {/* TODO: Replace with a user ComboBox once user lookup endpoint is available */}
            </Label>
            <Input
              id="reassign-user"
              {...register('toUserId')}
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
            />
            {errors.toUserId && (
              <p className="text-sm text-destructive">{errors.toUserId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reassign-role">
              Role ID (UUID)
              {/* TODO: Replace with a role ComboBox once role lookup endpoint is available */}
            </Label>
            <Input
              id="reassign-role"
              {...register('toRoleId')}
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reassign-reason">
              Reason{requireReason && <span className="text-destructive"> *</span>}
            </Label>
            <Textarea
              id="reassign-reason"
              {...register('reason', {
                validate: (v) =>
                  !requireReason || v.trim().length > 0 || 'Reason is required',
              })}
              rows={3}
              placeholder="Reason for reassignment"
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Reassigning...' : 'Reassign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { TimeOffStatusDTO, CreateTimeOffStatusDTO, UpdateTimeOffStatusDTO } from '@shared/dto';
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
import { apiPost, apiPut } from '@/lib/api';

interface TimeOffStatusFormData {
  statusName: string;
  statusShortName: string;
}

interface TimeOffStatusFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: TimeOffStatusDTO;
  onSuccess: () => void;
}

export function TimeOffStatusFormDialog({
  open,
  onOpenChange,
  status,
  onSuccess,
}: TimeOffStatusFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!status;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimeOffStatusFormData>({
    defaultValues: {
      statusName: '',
      statusShortName: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        statusName: status?.statusName ?? '',
        statusShortName: status?.statusShortName ?? '',
      });
    }
  }, [open, status, reset]);

  const onSubmit = async (data: TimeOffStatusFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateTimeOffStatusDTO = {
          statusName: data.statusName.trim(),
          statusShortName: data.statusShortName.trim() || undefined,
        };
        await apiPut<TimeOffStatusDTO, UpdateTimeOffStatusDTO>(
          `/api/time-off-statuses/${status.statusId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Status updated successfully' });
      } else {
        const payload: CreateTimeOffStatusDTO = {
          statusName: data.statusName.trim(),
          statusShortName: data.statusShortName.trim() || undefined,
        };
        await apiPost<TimeOffStatusDTO, CreateTimeOffStatusDTO>('/api/time-off-statuses', payload);
        toast({ title: 'Success', description: 'Status created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} status`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Status' : 'New Status'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the time off status name below.'
              : 'Enter a name for the new time off status.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="statusName">Status Name</Label>
              <Input
                id="statusName"
                placeholder="e.g., Approved"
                {...register('statusName', {
                  required: 'Status name is required',
                  minLength: {
                    value: 2,
                    message: 'Status name must be at least 2 characters',
                  },
                })}
              />
              {errors.statusName && (
                <p className="text-sm text-destructive">{errors.statusName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusShortName">Short Name</Label>
              <Input
                id="statusShortName"
                placeholder="e.g., APR"
                maxLength={20}
                {...register('statusShortName', {
                  maxLength: {
                    value: 20,
                    message: 'Short name must be 20 characters or fewer',
                  },
                })}
              />
              {errors.statusShortName && (
                <p className="text-sm text-destructive">{errors.statusShortName.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

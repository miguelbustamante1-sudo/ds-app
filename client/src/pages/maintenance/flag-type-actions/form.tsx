import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { FlagTypeActionDTO, CreateFlagTypeActionDTO, UpdateFlagTypeActionDTO } from '@shared/dto';
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

interface FlagTypeActionFormData {
  category: string;
  actionLabel: string;
  actionUrl: string;
}

interface FlagTypeActionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: FlagTypeActionDTO;
  onSuccess: () => void;
}

export function FlagTypeActionFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: FlagTypeActionFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FlagTypeActionFormData>({
    defaultValues: { category: '', actionLabel: '', actionUrl: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        category: record?.category ?? '',
        actionLabel: record?.actionLabel ?? '',
        actionUrl: record?.actionUrl ?? '',
      });
    }
  }, [open, record, reset]);

  const onSubmit = async (data: FlagTypeActionFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateFlagTypeActionDTO = {
          category: data.category.trim(),
          actionLabel: data.actionLabel.trim(),
          actionUrl: data.actionUrl.trim(),
        };
        await apiPut<FlagTypeActionDTO, UpdateFlagTypeActionDTO>(
          `/api/flag-type-actions/${record.flagTypeActionId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Flag type action updated successfully' });
      } else {
        const payload: CreateFlagTypeActionDTO = {
          category: data.category.trim(),
          actionLabel: data.actionLabel.trim(),
          actionUrl: data.actionUrl.trim(),
        };
        await apiPost<FlagTypeActionDTO, CreateFlagTypeActionDTO>('/api/flag-type-actions', payload);
        toast({ title: 'Success', description: 'Flag type action created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} flag type action`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Flag Type Action' : 'New Flag Type Action'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the action link for category "${record.category}".`
              : 'Fill in the details to create a new flag type action link.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Input
                id="category"
                placeholder="e.g., 1o1 Tracking"
                {...register('category', {
                  required: 'Category is required',
                  minLength: { value: 2, message: 'Category must be at least 2 characters' },
                })}
              />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionLabel">
                Action Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="actionLabel"
                placeholder="e.g., Open Staff Tasks Board"
                {...register('actionLabel', { required: 'Action label is required' })}
              />
              {errors.actionLabel && <p className="text-sm text-destructive">{errors.actionLabel.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionUrl">
                Action URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="actionUrl"
                type="url"
                placeholder="https://..."
                {...register('actionUrl', { required: 'Action URL is required' })}
              />
              {errors.actionUrl && <p className="text-sm text-destructive">{errors.actionUrl.message}</p>}
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

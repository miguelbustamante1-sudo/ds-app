import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { TimeOffCategoryDTO, CreateTimeOffCategoryDTO, UpdateTimeOffCategoryDTO } from '@shared/dto';
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

interface TimeOffTypeFormData {
  categoryName: string;
  categoryShortName: string;
}

interface TimeOffTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOffType?: TimeOffCategoryDTO;
  onSuccess: () => void;
}

export function TimeOffTypeFormDialog({
  open,
  onOpenChange,
  timeOffType,
  onSuccess,
}: TimeOffTypeFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!timeOffType;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimeOffTypeFormData>({
    defaultValues: { categoryName: '', categoryShortName: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        categoryName: timeOffType?.categoryName ?? '',
        categoryShortName: timeOffType?.categoryShortName ?? '',
      });
    }
  }, [open, timeOffType, reset]);

  const onSubmit = async (data: TimeOffTypeFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateTimeOffCategoryDTO = {
          categoryName: data.categoryName.trim(),
          categoryShortName: data.categoryShortName.trim() || undefined,
        };
        await apiPut<TimeOffCategoryDTO, UpdateTimeOffCategoryDTO>(
          `/api/time-off-category/${timeOffType.categoryId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Time off type updated successfully' });
      } else {
        const payload: CreateTimeOffCategoryDTO = {
          categoryName: data.categoryName.trim(),
          categoryShortName: data.categoryShortName.trim() || undefined,
        };
        await apiPost<TimeOffCategoryDTO, CreateTimeOffCategoryDTO>('/api/time-off-category', payload);
        toast({ title: 'Success', description: 'Time off type created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} time off type`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Time Off Type' : 'New Time Off Type'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the time off type information below.'
              : 'Fill in the details to create a new time off type.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="categoryName"
                placeholder="e.g., Vacation"
                {...register('categoryName', {
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
              />
              {errors.categoryName && (
                <p className="text-sm text-destructive">{errors.categoryName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryShortName">Short Name</Label>
              <Input
                id="categoryShortName"
                placeholder="e.g., VAC"
                maxLength={20}
                {...register('categoryShortName', {
                  maxLength: {
                    value: 20,
                    message: 'Short name must be 20 characters or fewer',
                  },
                })}
              />
              {errors.categoryShortName && (
                <p className="text-sm text-destructive">{errors.categoryShortName.message}</p>
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

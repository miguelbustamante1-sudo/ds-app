import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { BonusCategoryDTO, CreateBonusCategoryDTO, UpdateBonusCategoryDTO } from '@shared/dto';
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

interface BonusCategoryFormData {
  bonusCategoryName: string;
}

interface BonusCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bonusCategory?: BonusCategoryDTO;
  onSuccess: () => void;
}

export function BonusCategoryFormDialog({
  open,
  onOpenChange,
  bonusCategory,
  onSuccess,
}: BonusCategoryFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!bonusCategory;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BonusCategoryFormData>({
    defaultValues: {
      bonusCategoryName: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (bonusCategory) {
        reset({
          bonusCategoryName: bonusCategory.bonusCategoryName,
        });
      } else {
        reset({
          bonusCategoryName: '',
        });
      }
    }
  }, [open, bonusCategory, reset]);

  const onSubmit = async (data: BonusCategoryFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateBonusCategoryDTO = {
          bonusCategoryName: data.bonusCategoryName.trim(),
        };
        await apiPut<BonusCategoryDTO, UpdateBonusCategoryDTO>(`/api/bonus-categories/${bonusCategory.bonusCategoryId}`, payload);
        toast({
          title: 'Success',
          description: 'Bonus category updated successfully',
        });
      } else {
        const payload: CreateBonusCategoryDTO = {
          bonusCategoryName: data.bonusCategoryName.trim(),
        };
        await apiPost<BonusCategoryDTO, CreateBonusCategoryDTO>('/api/bonus-categories', payload);
        toast({
          title: 'Success',
          description: 'Bonus category created successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} bonus category`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Bonus Category' : 'New Bonus Category'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the bonus category information below.'
              : 'Fill in the details to create a new bonus category.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bonusCategoryName">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bonusCategoryName"
                placeholder="e.g., Performance Bonus"
                {...register('bonusCategoryName', {
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
              />
              {errors.bonusCategoryName && (
                <p className="text-sm text-destructive">{errors.bonusCategoryName.message}</p>
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

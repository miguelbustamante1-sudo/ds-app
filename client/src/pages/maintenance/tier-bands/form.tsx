import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { TierBandDTO, CreateTierBandDTO, UpdateTierBandDTO } from '@shared/dto';
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

interface TierBandFormData {
  tierBandDescription: string;
}

interface TierBandFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tierBand?: TierBandDTO;
  onSuccess: () => void;
}

export function TierBandFormDialog({
  open,
  onOpenChange,
  tierBand,
  onSuccess,
}: TierBandFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!tierBand;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TierBandFormData>({
    defaultValues: {
      tierBandDescription: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (tierBand) {
        reset({
          tierBandDescription: tierBand.tierBandDescription,
        });
      } else {
        reset({
          tierBandDescription: '',
        });
      }
    }
  }, [open, tierBand, reset]);

  const onSubmit = async (data: TierBandFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateTierBandDTO = {
          tierBandDescription: data.tierBandDescription.trim(),
        };
        await apiPut<TierBandDTO, UpdateTierBandDTO>(`/api/tier-bands/${tierBand.tierBandId}`, payload);
        toast({
          title: 'Success',
          description: 'Tier band updated successfully',
        });
      } else {
        const payload: CreateTierBandDTO = {
          tierBandDescription: data.tierBandDescription.trim(),
        };
        await apiPost<TierBandDTO, CreateTierBandDTO>('/api/tier-bands', payload);
        toast({
          title: 'Success',
          description: 'Tier band created successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} tier band`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Tier Band' : 'New Tier Band'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the tier band information below.'
              : 'Fill in the details to create a new tier band.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tierBandDescription">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tierBandDescription"
                placeholder="e.g., Band A"
                {...register('tierBandDescription', {
                  required: 'Description is required',
                  minLength: {
                    value: 2,
                    message: 'Description must be at least 2 characters',
                  },
                })}
              />
              {errors.tierBandDescription && (
                <p className="text-sm text-destructive">{errors.tierBandDescription.message}</p>
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

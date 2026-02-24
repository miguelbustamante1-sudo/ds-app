import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { OptionDTO } from '@shared/dto';
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
import { useAuth } from '@/auth/auth-provider';
import { createOption, updateOption } from '@/services/security';

interface OptionFormData {
  optionDescription: string;
}

interface OptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option?: OptionDTO;
  onSuccess: () => void;
}

export function OptionFormDialog({ open, onOpenChange, option, onSuccess }: OptionFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!option;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OptionFormData>({
    defaultValues: { optionDescription: '' },
  });

  useEffect(() => {
    if (open) {
      if (option) {
        reset({ optionDescription: option.optionDescription ?? '' });
      } else {
        reset({ optionDescription: '' });
      }
    }
  }, [open, option, reset]);

  const onSubmit = async (data: OptionFormData) => {
    try {
      if (isEditing) {
        await updateOption(option.optionId, data.optionDescription.trim());
        toast({ title: 'Success', description: 'Resource updated successfully' });
      } else {
        await createOption(data.optionDescription.trim(), user?.email ?? null);
        toast({ title: 'Success', description: 'Resource created successfully' });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} resource`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Resource' : 'New Resource'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the resource key below.'
              : 'Enter the resource key string used in requirePermission().'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="optionDescription">
                Resource Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="optionDescription"
                placeholder="e.g., TimeOffs, Users"
                {...register('optionDescription', {
                  required: 'Resource key is required',
                  minLength: { value: 2, message: 'Resource key must be at least 2 characters' },
                })}
              />
              {errors.optionDescription && (
                <p className="text-sm text-destructive">{errors.optionDescription.message}</p>
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

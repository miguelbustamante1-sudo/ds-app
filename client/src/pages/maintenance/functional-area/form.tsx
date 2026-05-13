import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { FunctionalAreaDTO, CreateFunctionalAreaDTO, UpdateFunctionalAreaDTO } from '@shared/dto';
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

interface FunctionalAreaFormData {
  Name: string;
}

interface FunctionalAreaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: FunctionalAreaDTO;
  onSuccess: () => void;
}

export function FunctionalAreaFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: FunctionalAreaFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FunctionalAreaFormData>({
    defaultValues: { Name: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ Name: record?.Name ?? '' });
    }
  }, [open, record, reset]);

  const onSubmit = async (data: FunctionalAreaFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateFunctionalAreaDTO = { Name: data.Name.trim() };
        await apiPut<FunctionalAreaDTO, UpdateFunctionalAreaDTO>(
          `/api/functional-areas/${record.Id}`,
          payload,
        );
        toast({ title: 'Success', description: 'Functional area updated successfully' });
      } else {
        const payload: CreateFunctionalAreaDTO = { Name: data.Name.trim() };
        await apiPost<FunctionalAreaDTO, CreateFunctionalAreaDTO>('/api/functional-areas', payload);
        toast({ title: 'Success', description: 'Functional area created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} functional area`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Functional Area' : 'New Functional Area'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the functional area "${record.Name}".`
              : 'Fill in the details to create a new functional area.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="Name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="Name"
                placeholder="e.g., Engineering"
                {...register('Name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
              {errors.Name && <p className="text-sm text-destructive">{errors.Name.message}</p>}
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

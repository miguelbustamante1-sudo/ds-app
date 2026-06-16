import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiPatch } from '@/lib/api';
import type { PayrolDTO, CreatePayrolDTO, UpdatePayrolDTO } from '@shared/dto/Payrol';

interface PayrolFormData {
  prlDescription: string;
  prlStartDate: string;
  prlEndDate: string;
}

interface PayrolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: PayrolDTO;
  onSuccess: () => void;
}

export function PayrolFormDialog({ open, onOpenChange, record, onSuccess }: PayrolFormDialogProps) {
  const isEditing = !!record;
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PayrolFormData>();

  useEffect(() => {
    if (open) {
      reset({
        prlDescription: record?.prlDescription ?? '',
        prlStartDate: record?.prlStartDate?.slice(0, 10) ?? '',
        prlEndDate: record?.prlEndDate?.slice(0, 10) ?? '',
      });
    }
  }, [open, record, reset]);

  const onSubmit = async (data: PayrolFormData) => {
    try {
      if (isEditing) {
        const payload: UpdatePayrolDTO = {
          prlDescription: data.prlDescription.trim(),
          prlStartDate: data.prlStartDate,
          prlEndDate: data.prlEndDate,
        };
        await apiPatch<PayrolDTO, UpdatePayrolDTO>(`/api/payrol/${record?.prlId}`, payload);
        toast({ title: 'Success', description: 'Payrol period updated' });
      } else {
        const payload: CreatePayrolDTO = {
          prlDescription: data.prlDescription.trim(),
          prlStartDate: data.prlStartDate,
          prlEndDate: data.prlEndDate,
        };
        await apiPost<PayrolDTO, CreatePayrolDTO>('/api/payrol', payload);
        toast({ title: 'Success', description: 'Payrol period created' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Payrol Period' : 'Create Payrol Period'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="prlDescription">
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prlDescription"
              {...register('prlDescription', { required: 'Description is required' })}
            />
            {errors.prlDescription && (
              <p className="text-sm text-destructive">{errors.prlDescription.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="prlStartDate">
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prlStartDate"
              type="date"
              {...register('prlStartDate', { required: 'Start date is required' })}
            />
            {errors.prlStartDate && (
              <p className="text-sm text-destructive">{errors.prlStartDate.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="prlEndDate">
              End Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prlEndDate"
              type="date"
              {...register('prlEndDate', { required: 'End date is required' })}
            />
            {errors.prlEndDate && (
              <p className="text-sm text-destructive">{errors.prlEndDate.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

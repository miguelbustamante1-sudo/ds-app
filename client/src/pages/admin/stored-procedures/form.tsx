import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { registerProcedure, updateProcedure } from './api';
import type {
  CreateStoredProcedureDTO,
  UpdateStoredProcedureDTO,
  StoredProcedureDTO,
} from '@shared/dto/StoredProcedure';

const SCHEMA_OPTIONS: ComboBoxOption[] = [
  { label: 'ds', value: 'ds' },
  { label: 'es', value: 'es' },
];

interface RegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: StoredProcedureDTO | null;
  onSuccess: (record: StoredProcedureDTO) => void;
}

interface FormData {
  spSchema: string;
  spName: string;
  spLabel: string;
  spDescription: string;
}

export function RegisterDialog({ open, onOpenChange, record, onSuccess }: RegisterDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;

  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      spSchema: 'ds',
      spName: '',
      spLabel: '',
      spDescription: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (record) {
        reset({
          spSchema: record.spSchema,
          spName: record.spName,
          spLabel: record.spLabel,
          spDescription: record.spDescription ?? '',
        });
      } else {
        reset({ spSchema: 'ds', spName: '', spLabel: '', spDescription: '' });
      }
    }
  }, [open, record, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && record) {
        const payload: UpdateStoredProcedureDTO = {
          spLabel: data.spLabel.trim(),
          spDescription: data.spDescription.trim() || null,
        };
        const updated = await updateProcedure(record.spId, payload);
        toast({ title: 'Success', description: 'Procedure updated successfully' });
        onSuccess(updated);
      } else {
        const payload: CreateStoredProcedureDTO = {
          spSchema: data.spSchema,
          spName: data.spName.trim(),
          spLabel: data.spLabel.trim(),
          spDescription: data.spDescription.trim() || null,
        };
        const created = await registerProcedure(payload);
        toast({ title: 'Success', description: 'Procedure registered successfully' });
        onSuccess(created);
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'register'} procedure`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Procedure' : 'Register Procedure'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEditing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="spSchema">
                  Schema <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="spSchema"
                  control={control}
                  rules={{ required: 'Schema is required' }}
                  render={({ field }) => (
                    <ComboBox
                      options={SCHEMA_OPTIONS}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select schema..."
                    />
                  )}
                />
                {errors.spSchema && <p className="text-sm text-destructive">{errors.spSchema.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="spName">
                  Procedure Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="spName"
                  {...register('spName', { required: 'Name is required' })}
                  placeholder="e.g., fn_gt_vacation_days"
                />
                {errors.spName && <p className="text-sm text-destructive">{errors.spName.message}</p>}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="spLabel">
              Display Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="spLabel"
              {...register('spLabel', { required: 'Label is required' })}
              placeholder="e.g., Calculate Guatemala Vacation Days"
            />
            {errors.spLabel && <p className="text-sm text-destructive">{errors.spLabel.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="spDescription">Description</Label>
            <Input
              id="spDescription"
              {...register('spDescription')}
              placeholder="Optional description..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Register'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

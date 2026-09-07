import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { ApiError } from '@/lib/api';
import { createPool, updatePool, type GiftCardPoolDTO } from '@/services/giftCardPool';

interface FormData {
  poolCode: string;
  poolName: string;
}

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
  pool?:        GiftCardPoolDTO | null;
}

export function PoolFormDialog({ open, onOpenChange, onSuccess, pool }: Props) {
  const { toast } = useToast();
  const isEdit = !!pool;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ defaultValues: { poolCode: '', poolName: '' } });

  useEffect(() => {
    if (!open) return;
    reset({
      poolCode: pool?.poolCode ?? '',
      poolName: pool?.poolName ?? '',
    });
  }, [open, pool, reset]);

  const onSave = async (data: FormData) => {
    try {
      if (isEdit && pool) {
        await updatePool(pool.poolId, { poolCode: data.poolCode, poolName: data.poolName });
        toast({ title: 'Updated', description: `Pool "${data.poolName}" updated successfully.` });
      } else {
        await createPool({ poolCode: data.poolCode, poolName: data.poolName });
        toast({ title: 'Created', description: `Pool "${data.poolName}" created successfully.` });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : `Failed to ${isEdit ? 'update' : 'create'} pool`;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Pool' : 'Add Pool'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the pool details below.' : 'Fill in the details to create a new pool.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="poolCode">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="poolCode"
                placeholder="e.g. DATO"
                {...register('poolCode', { required: 'Code is required' })}
              />
              {errors.poolCode && (
                <p className="text-sm text-destructive">{errors.poolCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="poolName">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="poolName"
                placeholder="e.g. Data Operations"
                {...register('poolName', { required: 'Name is required' })}
              />
              {errors.poolName && (
                <p className="text-sm text-destructive">{errors.poolName.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
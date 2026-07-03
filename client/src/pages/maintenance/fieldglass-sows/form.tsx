import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { FieldglassSowDTO, CreateFieldglassSowDTO, UpdateFieldglassSowDTO } from '@shared/dto';
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

interface FieldglassSowFormData {
  sowName: string;
  sowId: string;
  sowOwner: string;
  backupSowOwner: string;
  tdxSowCreatorsPrimary: string;
  tdxSowCreatorsDelegate: string;
  tdxTaPrimePrimary: string;
  tdxTaPrimeDelegate: string;
  tdxProfileWorkerCreatorsPrimary: string;
  tdxProfileWorkerCreatorsDelegate: string;
}

interface FieldglassSowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: FieldglassSowDTO;
  onSuccess: () => void;
}

export function FieldglassSowFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: FieldglassSowFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FieldglassSowFormData>({
    defaultValues: {
      sowName: '',
      sowId: '',
      sowOwner: '',
      backupSowOwner: '',
      tdxSowCreatorsPrimary: '',
      tdxSowCreatorsDelegate: '',
      tdxTaPrimePrimary: '',
      tdxTaPrimeDelegate: '',
      tdxProfileWorkerCreatorsPrimary: '',
      tdxProfileWorkerCreatorsDelegate: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        sowName: record?.sowName ?? '',
        sowId: record?.sowId ?? '',
        sowOwner: record?.sowOwner ?? '',
        backupSowOwner: record?.backupSowOwner ?? '',
        tdxSowCreatorsPrimary: record?.tdxSowCreatorsPrimary ?? '',
        tdxSowCreatorsDelegate: record?.tdxSowCreatorsDelegate ?? '',
        tdxTaPrimePrimary: record?.tdxTaPrimePrimary ?? '',
        tdxTaPrimeDelegate: record?.tdxTaPrimeDelegate ?? '',
        tdxProfileWorkerCreatorsPrimary: record?.tdxProfileWorkerCreatorsPrimary ?? '',
        tdxProfileWorkerCreatorsDelegate: record?.tdxProfileWorkerCreatorsDelegate ?? '',
      });
    }
  }, [open, record, reset]);

  const onSubmit = async (data: FieldglassSowFormData) => {
    const nullIfEmpty = (v: string) => v.trim() || null;
    try {
      if (isEditing) {
        const payload: UpdateFieldglassSowDTO = {
          sowName: nullIfEmpty(data.sowName),
          sowId: nullIfEmpty(data.sowId),
          sowOwner: nullIfEmpty(data.sowOwner),
          backupSowOwner: nullIfEmpty(data.backupSowOwner),
          tdxSowCreatorsPrimary: nullIfEmpty(data.tdxSowCreatorsPrimary),
          tdxSowCreatorsDelegate: nullIfEmpty(data.tdxSowCreatorsDelegate),
          tdxTaPrimePrimary: nullIfEmpty(data.tdxTaPrimePrimary),
          tdxTaPrimeDelegate: nullIfEmpty(data.tdxTaPrimeDelegate),
          tdxProfileWorkerCreatorsPrimary: nullIfEmpty(data.tdxProfileWorkerCreatorsPrimary),
          tdxProfileWorkerCreatorsDelegate: nullIfEmpty(data.tdxProfileWorkerCreatorsDelegate),
        };
        await apiPut<FieldglassSowDTO, UpdateFieldglassSowDTO>(
          `/api/fieldglass-sows/${record.fgsId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Fieldglass SOW updated successfully' });
      } else {
        const payload: CreateFieldglassSowDTO = {
          sowName: nullIfEmpty(data.sowName),
          sowId: nullIfEmpty(data.sowId),
          sowOwner: nullIfEmpty(data.sowOwner),
          backupSowOwner: nullIfEmpty(data.backupSowOwner),
          tdxSowCreatorsPrimary: nullIfEmpty(data.tdxSowCreatorsPrimary),
          tdxSowCreatorsDelegate: nullIfEmpty(data.tdxSowCreatorsDelegate),
          tdxTaPrimePrimary: nullIfEmpty(data.tdxTaPrimePrimary),
          tdxTaPrimeDelegate: nullIfEmpty(data.tdxTaPrimeDelegate),
          tdxProfileWorkerCreatorsPrimary: nullIfEmpty(data.tdxProfileWorkerCreatorsPrimary),
          tdxProfileWorkerCreatorsDelegate: nullIfEmpty(data.tdxProfileWorkerCreatorsDelegate),
        };
        await apiPost<FieldglassSowDTO, CreateFieldglassSowDTO>('/api/fieldglass-sows', payload);
        toast({ title: 'Success', description: 'Fieldglass SOW created successfully' });
      }
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: 'Error',
        description: message ?? `Failed to ${isEditing ? 'update' : 'create'} Fieldglass SOW`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Fieldglass SOW' : 'New Fieldglass SOW'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the details for SOW "${record.sowName ?? record.sowId}".`
              : 'Fill in the details to create a new Fieldglass SOW.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sowName">SOW Name</Label>
              <Input id="sowName" placeholder="e.g., SOW-2024-001" {...register('sowName')} />
              {errors.sowName && <p className="text-sm text-destructive">{errors.sowName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sowId">SOW ID</Label>
              <Input id="sowId" placeholder="e.g., SOW-123" {...register('sowId')} />
              {errors.sowId && <p className="text-sm text-destructive">{errors.sowId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sowOwner">SOW Owner</Label>
              <Input id="sowOwner" placeholder="e.g., john.doe@example.com" {...register('sowOwner')} />
              {errors.sowOwner && <p className="text-sm text-destructive">{errors.sowOwner.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="backupSowOwner">Backup SOW Owner</Label>
              <Input id="backupSowOwner" placeholder="e.g., jane.doe@example.com" {...register('backupSowOwner')} />
              {errors.backupSowOwner && <p className="text-sm text-destructive">{errors.backupSowOwner.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdxSowCreatorsPrimary">TDx SOW Creators — Primary</Label>
              <Input id="tdxSowCreatorsPrimary" {...register('tdxSowCreatorsPrimary')} />
              {errors.tdxSowCreatorsPrimary && <p className="text-sm text-destructive">{errors.tdxSowCreatorsPrimary.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdxSowCreatorsDelegate">TDx SOW Creators — Delegate(s)</Label>
              <Input id="tdxSowCreatorsDelegate" placeholder="Comma-separated" {...register('tdxSowCreatorsDelegate')} />
              {errors.tdxSowCreatorsDelegate && <p className="text-sm text-destructive">{errors.tdxSowCreatorsDelegate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdxTaPrimePrimary">TDx TA Prime — Primary</Label>
              <Input id="tdxTaPrimePrimary" {...register('tdxTaPrimePrimary')} />
              {errors.tdxTaPrimePrimary && <p className="text-sm text-destructive">{errors.tdxTaPrimePrimary.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdxTaPrimeDelegate">TDx TA Prime — Delegate(s)</Label>
              <Input id="tdxTaPrimeDelegate" placeholder="Comma-separated" {...register('tdxTaPrimeDelegate')} />
              {errors.tdxTaPrimeDelegate && <p className="text-sm text-destructive">{errors.tdxTaPrimeDelegate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdxProfileWorkerCreatorsPrimary">TDx Profile Worker Creators — Primary</Label>
              <Input id="tdxProfileWorkerCreatorsPrimary" {...register('tdxProfileWorkerCreatorsPrimary')} />
              {errors.tdxProfileWorkerCreatorsPrimary && <p className="text-sm text-destructive">{errors.tdxProfileWorkerCreatorsPrimary.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdxProfileWorkerCreatorsDelegate">TDx Profile Worker Creators — Delegate(s)</Label>
              <Input id="tdxProfileWorkerCreatorsDelegate" placeholder="Comma-separated" {...register('tdxProfileWorkerCreatorsDelegate')} />
              {errors.tdxProfileWorkerCreatorsDelegate && <p className="text-sm text-destructive">{errors.tdxProfileWorkerCreatorsDelegate.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
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

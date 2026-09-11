import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type {
  ApiPermissionCatalogDTO,
  CreatePermissionCatalogEntryDTO,
  UpdatePermissionCatalogEntryDTO,
} from '@shared/dto';
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
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiPut } from '@/lib/api';

interface PermissionCatalogFormData {
  apcResource: string;
  apcAction: string;
  apcLabel: string;
}

interface PermissionCatalogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ApiPermissionCatalogDTO;
  onSuccess: () => void;
}

const ACTION_OPTIONS: ComboBoxOption[] = [
  { value: 'read', label: 'Read' },
  { value: 'create', label: 'Create' },
  { value: 'delete', label: 'Delete' },
];

export function PermissionCatalogFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: PermissionCatalogFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PermissionCatalogFormData>({
    defaultValues: { apcResource: '', apcAction: '', apcLabel: '' },
  });

  const watchedAction = watch('apcAction');

  useEffect(() => {
    if (open) {
      reset({
        apcResource: record?.apcResource ?? '',
        apcAction: record?.apcAction ?? '',
        apcLabel: record?.apcLabel ?? '',
      });
    }
  }, [open, record, reset]);

  const onSubmit = async (data: PermissionCatalogFormData) => {
    try {
      if (isEditing) {
        const payload: UpdatePermissionCatalogEntryDTO = { apcLabel: data.apcLabel.trim() };
        await apiPut<ApiPermissionCatalogDTO, UpdatePermissionCatalogEntryDTO>(
          `/api/admin/api-keys/permission-catalog/${record.apcId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Permission catalog entry updated successfully' });
      } else {
        const payload: CreatePermissionCatalogEntryDTO = {
          apcResource: data.apcResource.trim(),
          apcAction: data.apcAction as 'read' | 'create' | 'delete',
          apcLabel: data.apcLabel.trim(),
        };
        await apiPost<ApiPermissionCatalogDTO, CreatePermissionCatalogEntryDTO>(
          '/api/admin/api-keys/permission-catalog',
          payload,
        );
        toast({ title: 'Success', description: 'Permission catalog entry created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} permission catalog entry`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Permission' : 'New Permission'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the label for "${record.apcResource}.${record.apcAction}". Resource and action cannot be changed after creation.`
              : 'Define a new resource/action pair that can be granted to an API key.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apcResource">
                Resource <span className="text-destructive">*</span>
              </Label>
              <Input
                id="apcResource"
                placeholder="e.g., PhoneAssignmentsReport"
                disabled={isEditing}
                {...register('apcResource', { required: 'Resource is required' })}
              />
              {errors.apcResource && (
                <p className="text-sm text-destructive">{errors.apcResource.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Action <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={ACTION_OPTIONS}
                value={watchedAction}
                onValueChange={(value) => setValue('apcAction', value)}
                placeholder="Select an action"
                searchPlaceholder="Search actions..."
                emptyMessage="No actions found."
                disabled={isEditing}
              />
              {errors.apcAction && (
                <p className="text-sm text-destructive">{errors.apcAction.message}</p>
              )}
              <input type="hidden" {...register('apcAction', { required: 'Action is required' })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apcLabel">
                Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="apcLabel"
                placeholder="e.g., View phone assignments report"
                {...register('apcLabel', { required: 'Label is required' })}
              />
              {errors.apcLabel && (
                <p className="text-sm text-destructive">{errors.apcLabel.message}</p>
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

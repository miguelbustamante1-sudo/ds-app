import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { RegionDTO, CreateRegionDTO, UpdateRegionDTO } from '@shared/dto';
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

interface RegionFormData {
  regionName: string;
}

interface RegionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region?: RegionDTO;
  onSuccess: () => void;
}

export function RegionFormDialog({
  open,
  onOpenChange,
  region,
  onSuccess,
}: RegionFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!region;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegionFormData>({
    defaultValues: { regionName: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ regionName: region?.regionName ?? '' });
    }
  }, [open, region, reset]);

  const onSubmit = async (data: RegionFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateRegionDTO = { regionName: data.regionName.trim() };
        await apiPut<RegionDTO, UpdateRegionDTO>(`/api/regions/${region.regionId}`, payload);
        toast({ title: 'Success', description: 'Region updated successfully' });
      } else {
        const payload: CreateRegionDTO = { regionName: data.regionName.trim() };
        await apiPost<RegionDTO, CreateRegionDTO>('/api/regions', payload);
        toast({ title: 'Success', description: 'Region created successfully' });
      }
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: 'Error',
        description: message || `Failed to ${isEditing ? 'update' : 'create'} region`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Region' : 'New Region'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the region name below.'
              : 'Enter a name to create a new region.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="regionName">
                Region Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="regionName"
                placeholder="e.g., Latin America"
                {...register('regionName', {
                  required: 'Region name is required',
                  minLength: { value: 2, message: 'Region name must be at least 2 characters' },
                })}
              />
              {errors.regionName && (
                <p className="text-sm text-destructive">{errors.regionName.message}</p>
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

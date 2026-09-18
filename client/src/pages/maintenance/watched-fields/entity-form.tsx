import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { CreateWatchedEntityDto, WatchedEntityDto } from '@shared/dto';
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
import { apiPost } from '@/lib/api';

interface WatchedEntityFormData {
  entityType: string;
  label: string;
  ownerEmail: string;
}

interface WatchedEntityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (created: WatchedEntityDto) => void;
}

export function WatchedEntityFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: WatchedEntityFormDialogProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WatchedEntityFormData>({
    defaultValues: { entityType: '', label: '', ownerEmail: '' },
  });

  useEffect(() => {
    if (open) reset({ entityType: '', label: '', ownerEmail: '' });
  }, [open, reset]);

  const onSubmit = async (data: WatchedEntityFormData) => {
    try {
      const created = await apiPost<WatchedEntityDto, CreateWatchedEntityDto>(
        '/api/watched-fields/entities',
        {
          entityType: data.entityType.trim().toLowerCase(),
          label: data.label.trim(),
          ownerEmail: data.ownerEmail.trim() || null,
        },
      );
      toast({ title: 'Success', description: 'Watched entity created successfully' });
      onSuccess(created);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create watched entity',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Watched Entity</DialogTitle>
          <DialogDescription>
            The entity type is permanent — it becomes the primary key referenced by findings,
            observations and approved states, and cannot be renamed or deleted afterwards.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="entityType">
                Entity Type <span className="text-destructive">*</span>
              </Label>
              <Input
                id="entityType"
                placeholder="e.g., opportunity"
                className="font-mono"
                {...register('entityType', {
                  required: 'Entity type is required',
                  pattern: {
                    value: /^[a-z][a-z0-9_]*$/,
                    message: 'Lowercase letters, digits and underscores only, starting with a letter',
                  },
                })}
              />
              {errors.entityType && (
                <p className="text-sm text-destructive">{errors.entityType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">
                Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label"
                placeholder="e.g., Salesforce Opportunity"
                {...register('label', { required: 'Label is required' })}
              />
              {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Owner Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="owner@telus.com"
                {...register('ownerEmail')}
              />
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
              {isSubmitting ? 'Saving...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

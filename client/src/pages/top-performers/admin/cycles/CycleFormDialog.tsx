import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cyclesApi } from '@/api/topPerformers/cycles';
import type { CreateTpCycleDTO } from '@shared/dto/TopPerformersCycle';

interface CycleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CycleFormData {
  cycName: string;
  cycNominationsStart: string;
  cycNominationsEnd: string;
  cycVotingStart: string;
  cycVotingEnd: string;
}

export function CycleFormDialog({ open, onOpenChange, onSuccess }: CycleFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CycleFormData>();

  useEffect(() => {
    if (open) {
      reset({
        cycName: '',
        cycNominationsStart: '',
        cycNominationsEnd: '',
        cycVotingStart: '',
        cycVotingEnd: '',
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: CycleFormData) => {
    try {
      const payload: CreateTpCycleDTO = {
        cycName: data.cycName.trim(),
        cycNominationsStart: data.cycNominationsStart,
        cycNominationsEnd: data.cycNominationsEnd,
        cycVotingStart: data.cycVotingStart,
        cycVotingEnd: data.cycVotingEnd,
      };
      await cyclesApi.create(payload);
      toast({ title: 'Success', description: 'Cycle created successfully.' });
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error creating cycle.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Cycle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cycName">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycName"
              {...register('cycName', { required: 'Name is required.' })}
            />
            {errors.cycName && (
              <p className="text-sm text-destructive">{errors.cycName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cycNominationsStart">
              Nominations Start <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycNominationsStart"
              type="datetime-local"
              {...register('cycNominationsStart', {
                required: 'Nominations start date is required.',
              })}
            />
            {errors.cycNominationsStart && (
              <p className="text-sm text-destructive">
                {errors.cycNominationsStart.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cycNominationsEnd">
              Nominations End <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycNominationsEnd"
              type="datetime-local"
              {...register('cycNominationsEnd', {
                required: 'Nominations end date is required.',
              })}
            />
            {errors.cycNominationsEnd && (
              <p className="text-sm text-destructive">
                {errors.cycNominationsEnd.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cycVotingStart">
              Voting Start <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycVotingStart"
              type="datetime-local"
              {...register('cycVotingStart', {
                required: 'Voting start date is required.',
              })}
            />
            {errors.cycVotingStart && (
              <p className="text-sm text-destructive">{errors.cycVotingStart.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cycVotingEnd">
              Voting End <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycVotingEnd"
              type="datetime-local"
              {...register('cycVotingEnd', {
                required: 'Voting end date is required.',
              })}
            />
            {errors.cycVotingEnd && (
              <p className="text-sm text-destructive">{errors.cycVotingEnd.message}</p>
            )}
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

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiPatch } from '@/lib/api';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignment: ProjectAssignmentWithDetailsDTO | null;
  onSuccess: () => void;
}

interface FormData {
  projectAssignmentEndDate: string;
}

export function RemoveMemberDialog({ open, onOpenChange, assignment, onSuccess }: Props) {
  const { toast } = useToast();
  const [isPastDate, setIsPastDate] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const watchedDate = watch('projectAssignmentEndDate');

  useEffect(() => {
    if (open && assignment) {
      const prefill = assignment.projectAssignmentEndDate
        ? new Date(assignment.projectAssignmentEndDate).toISOString().split('T')[0]
        : '';
      reset({ projectAssignmentEndDate: prefill });
    }
  }, [open, assignment, reset]);

  useEffect(() => {
    if (watchedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setIsPastDate(new Date(watchedDate) < today);
    } else {
      setIsPastDate(false);
    }
  }, [watchedDate]);

  const fullName = assignment?.teamMemberName ?? 'Team Member';

  const onSubmit = async (data: FormData) => {
    if (!assignment) return;
    try {
      await apiPatch(`/api/team-member-projects/${assignment.projectAssignmentId}`, {
        projectAssignmentEndDate: data.projectAssignmentEndDate,
      });
      toast({ title: 'Success', description: 'Team member removed from project.' });
      onSuccess();
    } catch {
      toast({ title: 'Error', description: 'Failed to remove team member. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Team Member — {fullName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectAssignmentEndDate">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentEndDate"
                type="date"
                {...register('projectAssignmentEndDate', {
                  required: 'End date is required',
                  validate: (val) => {
                    if (!assignment?.projectAssignmentStartDate) return true;
                    const endDate = new Date(val);
                    const startDate = new Date(assignment.projectAssignmentStartDate);
                    return endDate >= startDate || 'End date must be on or after the assignment start date';
                  },
                })}
              />
              {errors.projectAssignmentEndDate && (
                <p className="text-sm text-destructive">{errors.projectAssignmentEndDate.message}</p>
              )}
            </div>

            {isPastDate && (
              <div className="rounded-md bg-warning/10 border border-warning/30 px-3 py-2">
                <p className="text-sm text-warning-foreground">
                  The selected end date is in the past. This will immediately remove the team member from the active view.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

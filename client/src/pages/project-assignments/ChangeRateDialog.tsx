import { useEffect } from 'react';
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
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignment: ProjectAssignmentWithDetailsDTO | null;
  onSuccess: () => void;
}

interface FormData {
  newStartDate: string;
  newBillRate: string;
  newCurrency: string;
  newIntercompanyBillRate: string;
}

export function ChangeRateDialog({ open, onOpenChange, assignment, onSuccess }: Props) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  useEffect(() => {
    if (open && assignment) {
      reset({
        newStartDate: '',
        newBillRate: assignment.projectAssignmentBillRate?.toString() ?? '',
        newCurrency: assignment.projectAssignmentBillRateCurrency ?? '',
        newIntercompanyBillRate: assignment.intercompanyBillRate?.toString() ?? '',
      });
    }
  }, [open, assignment, reset]);

  const fullName = assignment?.teamMemberName ?? 'Team Member';

  const currentStartDate = assignment?.projectAssignmentStartDate
    ? formatUTCDate(assignment.projectAssignmentStartDate)
    : '';

  const onSubmit = async (data: FormData) => {
    if (!assignment) return;
    try {
      await apiPatch(`/api/team-member-projects/${assignment.projectAssignmentId}/change-rate`, {
        newStartDate: data.newStartDate,
        newBillRate: Number(data.newBillRate),
        newCurrency: data.newCurrency.toUpperCase(),
        newIntercompanyBillRate: data.newIntercompanyBillRate ? Number(data.newIntercompanyBillRate) : null,
      });
      toast({ title: 'Success', description: 'Bill rate updated successfully.' });
      onSuccess();
    } catch {
      toast({ title: 'Error', description: 'Failed to update bill rate. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Bill Rate — {fullName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newStartDate">
                New Start Date <span className="text-destructive">*</span>
              </Label>
              {currentStartDate && (
                <p className="text-xs text-muted-foreground">
                  Must be strictly after current start date: {currentStartDate}
                </p>
              )}
              <Input
                id="newStartDate"
                type="date"
                {...register('newStartDate', {
                  required: 'New start date is required',
                  validate: (val) => {
                    if (!assignment?.projectAssignmentStartDate) return true;
                    const newDate = parseUTCDateAsLocal(val);
                    const currentDate = parseUTCDateAsLocal(String(assignment.projectAssignmentStartDate));
                    return newDate > currentDate || 'Date must be strictly after the current start date';
                  },
                })}
              />
              {errors.newStartDate && (
                <p className="text-sm text-destructive">{errors.newStartDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newBillRate">
                New Bill Rate <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newBillRate"
                type="number"
                step="0.01"
                min="0.01"
                {...register('newBillRate', {
                  required: 'Bill rate is required',
                  min: { value: 0.01, message: 'Bill rate must be greater than 0' },
                })}
              />
              {errors.newBillRate && (
                <p className="text-sm text-destructive">{errors.newBillRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newCurrency">
                Currency <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newCurrency"
                type="text"
                maxLength={3}
                placeholder="USD"
                {...register('newCurrency', {
                  required: 'Currency is required',
                  maxLength: { value: 3, message: 'Currency must be at most 3 characters' },
                  setValueAs: (v: string) => v.toUpperCase(),
                })}
              />
              {errors.newCurrency && (
                <p className="text-sm text-destructive">{errors.newCurrency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newIntercompanyBillRate">Intercompany Bill Rate</Label>
              <Input
                id="newIntercompanyBillRate"
                type="number"
                step="0.01"
                min="0"
                {...register('newIntercompanyBillRate', {
                  min: { value: 0, message: 'Rate must be 0 or greater' },
                })}
              />
              {errors.newIntercompanyBillRate && (
                <p className="text-sm text-destructive">{errors.newIntercompanyBillRate.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { AvailableForProjectDTO } from '@shared/dto/TeamMemberReport';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { MemberComboBox } from './components/MemberComboBox';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: number;
  onSuccess: () => void;
}

interface FormData {
  teamMemberId: string;
  projectAssignmentStartDate: string;
  projectAssignmentEndDate: string;
  projectAssignmentBillRate: string;
  projectAssignmentBillRateCurrency: string;
  projectAssignmentAllocation: string;
}

export function AddMemberDialog({ open, onOpenChange, projectId, onSuccess }: Props) {
  const { toast } = useToast();
  const [selectedTm, setSelectedTm] = useState<AvailableForProjectDTO | null>(null);
  const [teamMemberId, setTeamMemberId] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      teamMemberId: '',
      projectAssignmentStartDate: '',
      projectAssignmentEndDate: '',
      projectAssignmentBillRate: '',
      projectAssignmentBillRateCurrency: '',
      projectAssignmentAllocation: '',
    },
  });

  const handleTmSelect = (tm: AvailableForProjectDTO) => {
    setSelectedTm(tm);
    setValue('projectAssignmentBillRateCurrency', tm.countryCurrencySymbol ?? '');
  };

  const handleValueChange = (val: string) => {
    setTeamMemberId(val);
    setValue('teamMemberId', val);
    if (!val) {
      setSelectedTm(null);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      reset();
      setTeamMemberId('');
      setSelectedTm(null);
    }
    onOpenChange(v);
  };

  const onSubmit = async (data: FormData) => {
    try {
      await apiPost('/api/team-member-projects', {
        teamMemberId: Number(data.teamMemberId),
        projectId,
        projectAssignmentStartDate: data.projectAssignmentStartDate,
        projectAssignmentEndDate: data.projectAssignmentEndDate || null,
        projectAssignmentBillRate: Number(data.projectAssignmentBillRate),
        projectAssignmentBillRateCurrency: data.projectAssignmentBillRateCurrency.toUpperCase(),
        projectAssignmentAllocation: Number(data.projectAssignmentAllocation),
      });
      toast({ title: 'Success', description: 'Team member added to project.' });
      onSuccess();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '';
      if (msg.toLowerCase().includes('active assignment')) {
        toast({ title: 'Error', description: 'This team member already has an active assignment to this project.', variant: 'destructive' });
      } else if (msg.toLowerCase().includes('allocation')) {
        toast({ title: 'Error', description: "Allocation exceeds the team member's available capacity.", variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to add team member. Please try again.', variant: 'destructive' });
      }
    }
  };

  const availableAllocation = selectedTm?.availableAllocation ?? null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Member to Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Team Member <span className="text-destructive">*</span>
              </Label>
              <MemberComboBox
                projectId={projectId}
                value={teamMemberId}
                onValueChange={handleValueChange}
                onSelectFull={handleTmSelect}
              />
              <input
                type="hidden"
                {...register('teamMemberId', { required: 'Team member is required' })}
              />
              {errors.teamMemberId && (
                <p className="text-sm text-destructive">{errors.teamMemberId.message}</p>
              )}
            </div>

            {selectedTm !== null && (
              <div>
                <Badge variant="outline">
                  {availableAllocation}% available
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentStartDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentStartDate"
                type="date"
                {...register('projectAssignmentStartDate', {
                  required: 'Start date is required',
                  validate: (val) => {
                    if (!val) return true;
                    const [year, month, day] = val.split('-').map(Number);
                    const dow = new Date(year, month - 1, day).getDay();
                    return (dow !== 0 && dow !== 6) || 'Start date cannot be a weekend';
                  },
                })}
              />
              {errors.projectAssignmentStartDate && (
                <p className="text-sm text-destructive">{errors.projectAssignmentStartDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentEndDate">End Date</Label>
              <Input
                id="projectAssignmentEndDate"
                type="date"
                {...register('projectAssignmentEndDate', {
                  validate: (val, formValues) => {
                    if (!val) return true;
                    return new Date(val) > new Date(formValues.projectAssignmentStartDate) || 'End date must be after start date';
                  },
                })}
              />
              {errors.projectAssignmentEndDate && (
                <p className="text-sm text-destructive">{errors.projectAssignmentEndDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentBillRate">
                Hourly Rate <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentBillRate"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g., 50.00"
                {...register('projectAssignmentBillRate', {
                  required: 'Hourly rate is required',
                  min: { value: 0.01, message: 'Rate must be greater than 0' },
                })}
              />
              {errors.projectAssignmentBillRate && (
                <p className="text-sm text-destructive">{errors.projectAssignmentBillRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentBillRateCurrency">
                Currency <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentBillRateCurrency"
                type="text"
                maxLength={3}
                placeholder="USD"
                {...register('projectAssignmentBillRateCurrency', {
                  required: 'Currency is required',
                  maxLength: { value: 3, message: 'Currency must be at most 3 characters' },
                })}
              />
              {errors.projectAssignmentBillRateCurrency && (
                <p className="text-sm text-destructive">{errors.projectAssignmentBillRateCurrency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentAllocation">
                Allocation % <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentAllocation"
                type="number"
                step="0.01"
                min="0.01"
                max={availableAllocation ?? 100}
                placeholder="e.g., 100"
                {...register('projectAssignmentAllocation', {
                  required: 'Allocation is required',
                  min: { value: 0.01, message: 'Allocation must be greater than 0' },
                  max: availableAllocation !== null
                    ? { value: availableAllocation, message: `Allocation cannot exceed available capacity (${availableAllocation}%)` }
                    : { value: 100, message: 'Allocation cannot exceed 100%' },
                })}
              />
              {errors.projectAssignmentAllocation && (
                <p className="text-sm text-destructive">{errors.projectAssignmentAllocation.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

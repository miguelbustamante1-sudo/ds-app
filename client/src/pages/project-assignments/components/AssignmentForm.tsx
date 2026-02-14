import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type {
  ProjectAssignmentWithDetailsDTO,
  CreateProjectAssignmentDTO,
  UpdateProjectAssignmentDTO,
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
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiPut } from '@/lib/api';
import { ProjectComboBox } from './ProjectComboBox';
import { MemberComboBox } from './MemberComboBox';

interface AssignmentFormData {
  projectId: string;
  teamMemberId: string;
  projectAssignmentStartDate: string;
  projectAssignmentEndDate: string;
  projectAssignmentBillRate: string;
  projectAssignmentBillRateCurrency: string;
  projectAssignmentAllocation: string;
}

interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ProjectAssignmentWithDetailsDTO;
  onSuccess: () => void;
}

export function AssignmentFormDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: AssignmentFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!item;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormData>({
    defaultValues: {
      projectId: '',
      teamMemberId: '',
      projectAssignmentStartDate: '',
      projectAssignmentEndDate: '',
      projectAssignmentBillRate: '',
      projectAssignmentBillRateCurrency: 'USD',
      projectAssignmentAllocation: '',
    },
  });

  const projectIdValue = watch('projectId');
  const teamMemberIdValue = watch('teamMemberId');

  useEffect(() => {
    if (open) {
      if (item) {
        reset({
          projectId: item.projectId?.toString() ?? '',
          teamMemberId: item.teamMemberId?.toString() ?? '',
          projectAssignmentStartDate: item.projectAssignmentStartDate
            ? new Date(item.projectAssignmentStartDate).toISOString().split('T')[0]
            : '',
          projectAssignmentEndDate: item.projectAssignmentEndDate
            ? new Date(item.projectAssignmentEndDate).toISOString().split('T')[0]
            : '',
          projectAssignmentBillRate: item.projectAssignmentBillRate?.toString() ?? '',
          projectAssignmentBillRateCurrency: item.projectAssignmentBillRateCurrency ?? 'USD',
          projectAssignmentAllocation: item.projectAssignmentAllocation?.toString() ?? '',
        });
      } else {
        reset({
          projectId: '',
          teamMemberId: '',
          projectAssignmentStartDate: '',
          projectAssignmentEndDate: '',
          projectAssignmentBillRate: '',
          projectAssignmentBillRateCurrency: 'USD',
          projectAssignmentAllocation: '',
        });
      }
    }
  }, [open, item, reset]);

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateProjectAssignmentDTO = {
          projectAssignmentStartDate: data.projectAssignmentStartDate,
          projectAssignmentEndDate: data.projectAssignmentEndDate || null,
          projectAssignmentBillRate: data.projectAssignmentBillRate ? Number(data.projectAssignmentBillRate) : null,
          projectAssignmentBillRateCurrency: data.projectAssignmentBillRateCurrency || null,
          projectAssignmentAllocation: data.projectAssignmentAllocation ? Number(data.projectAssignmentAllocation) : null,
        };
        await apiPut<ProjectAssignmentWithDetailsDTO, UpdateProjectAssignmentDTO>(
          `/api/team-member-projects/${item!.projectAssignmentId}`,
          payload
        );
        toast({ title: 'Success', description: 'Assignment updated successfully' });
      } else {
        const payload: CreateProjectAssignmentDTO = {
          teamMemberId: Number(data.teamMemberId),
          projectId: Number(data.projectId),
          projectAssignmentStartDate: data.projectAssignmentStartDate,
          projectAssignmentEndDate: data.projectAssignmentEndDate || null,
          projectAssignmentBillRate: data.projectAssignmentBillRate ? Number(data.projectAssignmentBillRate) : null,
          projectAssignmentBillRateCurrency: data.projectAssignmentBillRateCurrency || null,
          projectAssignmentAllocation: data.projectAssignmentAllocation ? Number(data.projectAssignmentAllocation) : null,
        };
        await apiPost<ProjectAssignmentWithDetailsDTO, CreateProjectAssignmentDTO>(
          '/api/team-member-projects',
          payload
        );
        toast({ title: 'Success', description: 'Assignment created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      const message = error?.message || `Failed to ${isEditing ? 'update' : 'create'} assignment`;
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Assignment' : 'New Assignment'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the project assignment details below.'
              : 'Fill in the details to create a new project assignment.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Project <span className="text-destructive">*</span>
              </Label>
              <ProjectComboBox
                value={projectIdValue}
                onValueChange={(value) => setValue('projectId', value)}
                disabled={isEditing}
              />
              {errors.projectId && (
                <p className="text-sm text-destructive">{errors.projectId.message}</p>
              )}
              <input
                type="hidden"
                {...register('projectId', { required: 'Project is required' })}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Team Member <span className="text-destructive">*</span>
              </Label>
              <MemberComboBox
                value={teamMemberIdValue}
                onValueChange={(value) => setValue('teamMemberId', value)}
                disabled={isEditing}
              />
              {errors.teamMemberId && (
                <p className="text-sm text-destructive">{errors.teamMemberId.message}</p>
              )}
              <input
                type="hidden"
                {...register('teamMemberId', { required: 'Team member is required' })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentStartDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentStartDate"
                type="date"
                {...register('projectAssignmentStartDate', { required: 'Start date is required' })}
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
                {...register('projectAssignmentEndDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentBillRate">
                Hourly Rate <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentBillRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 50.00"
                {...register('projectAssignmentBillRate', { required: 'Hourly rate is required' })}
              />
              {errors.projectAssignmentBillRate && (
                <p className="text-sm text-destructive">{errors.projectAssignmentBillRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentBillRateCurrency">Currency</Label>
              <Input
                id="projectAssignmentBillRateCurrency"
                type="text"
                placeholder="USD"
                {...register('projectAssignmentBillRateCurrency')}
              />
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
                max="100"
                placeholder="e.g., 100.00"
                {...register('projectAssignmentAllocation', {
                  required: 'Allocation is required',
                  min: { value: 0.01, message: 'Minimum allocation is 0.01%' },
                  max: { value: 100, message: 'Maximum allocation is 100%' },
                })}
              />
              {errors.projectAssignmentAllocation && (
                <p className="text-sm text-destructive">{errors.projectAssignmentAllocation.message}</p>
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

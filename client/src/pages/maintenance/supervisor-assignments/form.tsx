import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type {
  SupervisorAssignmentDTO,
  CreateSupervisorAssignmentDTO,
  UpdateSupervisorAssignmentDTO,
  TeamMemberDTO,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';

interface SupervisorAssignmentFormData {
  teamMemberId: string;
  supervisorId: string;
  supervisorAssignmentStartDate: string;
  supervisorAssignmentEndDate: string;
}

interface SupervisorAssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: SupervisorAssignmentDTO;
  onSuccess: () => void;
  onCreated?: (item: SupervisorAssignmentDTO) => void;
  onUpdated?: (item: SupervisorAssignmentDTO) => void;
}

export function SupervisorAssignmentFormDialog({
  open,
  onOpenChange,
  assignment,
  onSuccess,
  onCreated,
  onUpdated,
}: SupervisorAssignmentFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!assignment;
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupervisorAssignmentFormData>({
    defaultValues: {
      teamMemberId: '',
      supervisorId: '',
      supervisorAssignmentStartDate: '',
      supervisorAssignmentEndDate: '',
    },
  });

  const watchedTeamMemberId = watch('teamMemberId');
  const watchedSupervisorId = watch('supervisorId');

  // Validation: Prevent self-assignment
  const isSelfAssignment =
    !!watchedTeamMemberId &&
    !!watchedSupervisorId &&
    watchedTeamMemberId === watchedSupervisorId;

  // Load team members for selection
  useEffect(() => {
    if (open) {
      setLoadingTeamMembers(true);
      apiGet<TeamMemberDTO[]>('/api/team-members')
        .then((data) => setTeamMembers(data))
        .catch(() => toast({ title: 'Error', description: 'Failed to load team members', variant: 'destructive' }))
        .finally(() => setLoadingTeamMembers(false));
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      if (assignment) {
        const startDate = assignment.supervisorAssignmentStartDate
          ? new Date(assignment.supervisorAssignmentStartDate).toISOString().split('T')[0]
          : '';
        const endDate = assignment.supervisorAssignmentEndDate
          ? new Date(assignment.supervisorAssignmentEndDate).toISOString().split('T')[0]
          : '';
        reset({
          teamMemberId: assignment.teamMemberId?.toString() || '',
          supervisorId: assignment.supervisorId?.toString() || '',
          supervisorAssignmentStartDate: startDate,
          supervisorAssignmentEndDate: endDate,
        });
      } else {
        reset({
          teamMemberId: '',
          supervisorId: '',
          supervisorAssignmentStartDate: '',
          supervisorAssignmentEndDate: '',
        });
      }
    }
  }, [open, assignment, reset]);

  const onSubmit = async (data: SupervisorAssignmentFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateSupervisorAssignmentDTO = {
          teamMemberId: Number(data.teamMemberId),
          supervisorId: Number(data.supervisorId),
          supervisorAssignmentStartDate: data.supervisorAssignmentStartDate,
          supervisorAssignmentEndDate: data.supervisorAssignmentEndDate || null,
        };
        const updated = await apiPut<SupervisorAssignmentDTO, UpdateSupervisorAssignmentDTO>(
          `/api/supervisor-assignments/${assignment.supervisorAssignmentId}`,
          payload
        );
        toast({
          title: 'Success',
          description: 'Supervisor assignment updated successfully',
        });
        onUpdated?.(updated);
      } else {
        const payload: CreateSupervisorAssignmentDTO = {
          teamMemberId: Number(data.teamMemberId),
          supervisorId: Number(data.supervisorId),
          supervisorAssignmentStartDate: data.supervisorAssignmentStartDate,
          supervisorAssignmentEndDate: data.supervisorAssignmentEndDate || null,
        };
        const created = await apiPost<SupervisorAssignmentDTO, CreateSupervisorAssignmentDTO>('/api/supervisor-assignments', payload);
        toast({
          title: 'Success',
          description: 'Supervisor assignment created successfully',
        });
        onCreated?.(created);
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} supervisor assignment`,
        variant: 'destructive',
      });
    }
  };

  const formatTeamMemberOption = (tm: TeamMemberDTO) => {
    const name = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`;
    return tm.workdayId ? `${tm.workdayId} - ${name}` : name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Supervisor Assignment' : 'New Supervisor Assignment'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the supervisor assignment information below.'
              : 'Fill in the details to create a new supervisor assignment.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supervisorId">
                Supervisor <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchedSupervisorId}
                onValueChange={(value) => setValue('supervisorId', value)}
                disabled={loadingTeamMembers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingTeamMembers ? 'Loading...' : 'Select a supervisor'} />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((tm) => (
                    <SelectItem key={tm.teamMemberId} value={tm.teamMemberId.toString()}>
                      {formatTeamMemberOption(tm)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register('supervisorId', { required: 'Supervisor is required' })} />
              {errors.supervisorId && (
                <p className="text-sm text-destructive">{errors.supervisorId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamMemberId">
                Team Member <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchedTeamMemberId}
                onValueChange={(value) => setValue('teamMemberId', value)}
                disabled={loadingTeamMembers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingTeamMembers ? 'Loading...' : 'Select a team member'} />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((tm) => (
                    <SelectItem key={tm.teamMemberId} value={tm.teamMemberId.toString()}>
                      {formatTeamMemberOption(tm)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register('teamMemberId', { required: 'Team member is required' })} />
              {errors.teamMemberId && (
                <p className="text-sm text-destructive">{errors.teamMemberId.message}</p>
              )}
              {isSelfAssignment && (
                <p className="text-sm text-destructive">
                  A team member cannot supervise themselves
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supervisorAssignmentStartDate">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="supervisorAssignmentStartDate"
                  type="date"
                  {...register('supervisorAssignmentStartDate', {
                    required: 'Start date is required',
                  })}
                />
                {errors.supervisorAssignmentStartDate && (
                  <p className="text-sm text-destructive">{errors.supervisorAssignmentStartDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supervisorAssignmentEndDate">End Date</Label>
                <Input
                  id="supervisorAssignmentEndDate"
                  type="date"
                  {...register('supervisorAssignmentEndDate')}
                />
                <p className="text-sm text-muted-foreground">Leave empty for active assignments</p>
              </div>
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
            <Button type="submit" disabled={isSubmitting || loadingTeamMembers || isSelfAssignment}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

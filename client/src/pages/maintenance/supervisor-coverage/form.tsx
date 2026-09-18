import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { CreateSupervisorCoverageDTO, SupervisorCoverageDTO, TeamMemberDTO } from '@shared/dto';
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
import { apiGet, apiPost } from '@/lib/api';

interface SupervisorCoverageFormData {
  fromSupervisorId: string;
  toSupervisorId: string;
  coverageStartDate: string;
  coverageEndDate: string;
}

interface SupervisorCoverageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SupervisorCoverageFormDialog({ open, onOpenChange, onSuccess }: SupervisorCoverageFormDialogProps) {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupervisorCoverageFormData>({
    defaultValues: { fromSupervisorId: '', toSupervisorId: '', coverageStartDate: '', coverageEndDate: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ fromSupervisorId: '', toSupervisorId: '', coverageStartDate: '', coverageEndDate: '' });
      setLoadingTeamMembers(true);
      apiGet<TeamMemberDTO[]>('/api/team-members')
        .then((data) => setTeamMembers(data))
        .catch(() => toast({ title: 'Error', description: 'Failed to load team members', variant: 'destructive' }))
        .finally(() => setLoadingTeamMembers(false));
    }
  }, [open, reset, toast]);

  const formatTeamMemberOption = (tm: TeamMemberDTO): string => {
    const name = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`;
    return tm.workdayId ? `${name} (${tm.workdayId})` : name;
  };

  const teamMemberOptions: ComboBoxOption[] = teamMembers.map((tm) => ({
    value: tm.teamMemberId.toString(),
    label: formatTeamMemberOption(tm),
  }));

  const fromSupervisorId = watch('fromSupervisorId');

  const onSubmit = async (data: SupervisorCoverageFormData) => {
    try {
      const payload: CreateSupervisorCoverageDTO = {
        fromSupervisorId: Number(data.fromSupervisorId),
        toSupervisorId: Number(data.toSupervisorId),
        coverageStartDate: data.coverageStartDate,
        coverageEndDate: data.coverageEndDate || null,
      };
      await apiPost<SupervisorCoverageDTO, CreateSupervisorCoverageDTO>('/api/supervisor-coverage', payload);
      toast({ title: 'Success', description: 'Supervisor coverage created successfully' });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create supervisor coverage',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Supervisor Coverage</DialogTitle>
          <DialogDescription>
            Let one supervisor temporarily cover another's team. Both approval rights and dashboard
            visibility transfer for the window below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Supervisor Being Covered <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="fromSupervisorId"
                control={control}
                rules={{ required: 'This field is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={teamMemberOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={loadingTeamMembers ? 'Loading...' : 'Select the supervisor being covered'}
                    searchPlaceholder="Search team members..."
                    emptyMessage="No team members found."
                    disabled={loadingTeamMembers}
                  />
                )}
              />
              {errors.fromSupervisorId && (
                <p className="text-sm text-destructive">{errors.fromSupervisorId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Covering Supervisor <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="toSupervisorId"
                control={control}
                rules={{
                  required: 'This field is required',
                  validate: (value) => value !== fromSupervisorId || 'A supervisor cannot cover themselves',
                }}
                render={({ field }) => (
                  <ComboBox
                    options={teamMemberOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={loadingTeamMembers ? 'Loading...' : 'Select the covering supervisor'}
                    searchPlaceholder="Search team members..."
                    emptyMessage="No team members found."
                    disabled={loadingTeamMembers}
                  />
                )}
              />
              {errors.toSupervisorId && <p className="text-sm text-destructive">{errors.toSupervisorId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverageStartDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="coverageStartDate"
                control={control}
                rules={{ required: 'Start date is required' }}
                render={({ field }) => <Input id="coverageStartDate" type="date" {...field} />}
              />
              {errors.coverageStartDate && (
                <p className="text-sm text-destructive">{errors.coverageStartDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverageEndDate">End Date (optional)</Label>
              <Controller
                name="coverageEndDate"
                control={control}
                render={({ field }) => <Input id="coverageEndDate" type="date" {...field} />}
              />
              <p className="text-sm text-muted-foreground">Leave empty for open-ended coverage</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loadingTeamMembers}>
              {isSubmitting ? 'Saving...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

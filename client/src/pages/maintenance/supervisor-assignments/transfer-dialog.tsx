import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { TeamMemberDTO, TransferSupervisorAssignmentsResultDTO } from '@shared/dto';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost } from '@/lib/api';
import type { TransferSupervisorAssignmentsDTO } from '@shared/dto';

interface TransferFormData {
  fromSupervisorId: string;
  toSupervisorId: string;
}

interface SupervisorAssignmentTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SupervisorAssignmentTransferDialog({
  open,
  onOpenChange,
  onSuccess,
}: SupervisorAssignmentTransferDialogProps) {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  const {
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransferFormData>({
    defaultValues: { fromSupervisorId: '', toSupervisorId: '' },
  });

  const fromSupervisorId = watch('fromSupervisorId');
  const toSupervisorId = watch('toSupervisorId');
  const isSameSupervisor = !!fromSupervisorId && fromSupervisorId === toSupervisorId;

  useEffect(() => {
    if (open) {
      reset({ fromSupervisorId: '', toSupervisorId: '' });
      setLoadingTeamMembers(true);
      apiGet<TeamMemberDTO[]>('/api/team-members')
        .then((data) => setTeamMembers(data))
        .catch(() =>
          toast({ title: 'Error', description: 'Failed to load team members', variant: 'destructive' }),
        )
        .finally(() => setLoadingTeamMembers(false));
    }
  }, [open, reset, toast]);

  const formatTeamMemberOption = (tm: TeamMemberDTO) => {
    const name = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`;
    return tm.workdayId ? `${tm.workdayId} - ${name}` : name;
  };

  const teamMemberOptions: ComboBoxOption[] = teamMembers.map((tm) => ({
    value: tm.teamMemberId.toString(),
    label: formatTeamMemberOption(tm),
  }));

  const onSubmit = async (data: TransferFormData) => {
    try {
      const payload: TransferSupervisorAssignmentsDTO = {
        fromSupervisorId: Number(data.fromSupervisorId),
        toSupervisorId: Number(data.toSupervisorId),
      };
      const result = await apiPost<TransferSupervisorAssignmentsResultDTO, TransferSupervisorAssignmentsDTO>(
        '/api/supervisor-assignments/transfer',
        payload,
      );
      const transferred = result.transferredCount;
      const skipped = result.skippedCount;
      const description =
        skipped > 0
          ? `${transferred} assignment${transferred === 1 ? '' : 's'} transferred. ${skipped} skipped (already assigned to target supervisor).`
          : `${transferred} assignment${transferred === 1 ? '' : 's'} transferred successfully.`;
      toast({ title: 'Success', description });
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to transfer assignments',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer Assignments</DialogTitle>
          <DialogDescription>
            All active assignments from the selected supervisor will be transferred to the new supervisor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                From Supervisor <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="fromSupervisorId"
                control={control}
                rules={{ required: 'Source supervisor is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={teamMemberOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={loadingTeamMembers ? 'Loading...' : 'Select source supervisor'}
                    searchPlaceholder="Search supervisors..."
                    emptyMessage="No supervisors found."
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
                To Supervisor <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="toSupervisorId"
                control={control}
                rules={{ required: 'Target supervisor is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={teamMemberOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={loadingTeamMembers ? 'Loading...' : 'Select target supervisor'}
                    searchPlaceholder="Search supervisors..."
                    emptyMessage="No supervisors found."
                    disabled={loadingTeamMembers}
                  />
                )}
              />
              {errors.toSupervisorId && (
                <p className="text-sm text-destructive">{errors.toSupervisorId.message}</p>
              )}
              {isSameSupervisor && (
                <p className="text-sm text-destructive">Source and target supervisor must be different</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || loadingTeamMembers || isSameSupervisor}
            >
              {isSubmitting ? 'Transferring...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type {
  TeamMemberReimbursementDTO,
  CreateTeamMemberReimbursementDTO,
  UpdateTeamMemberReimbursementDTO,
  TeamMemberDTO,
  PayrolDTO,
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
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';

interface ReimbursementFormData {
  teamMemberId: string;
  reimbursementAmount: string;
  reimbursementDate: string;
  payrolId: string;
  reimbursementFrequency: string;
}

interface ReimbursementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: TeamMemberReimbursementDTO;
  onSuccess: () => void;
  onCreated?: (item: TeamMemberReimbursementDTO) => void;
  onUpdated?: (item: TeamMemberReimbursementDTO) => void;
}

export function ReimbursementFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
  onCreated,
  onUpdated,
}: ReimbursementFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [payrols, setPayrols] = useState<PayrolDTO[]>([]);
  const [loadingPayrols, setLoadingPayrols] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ReimbursementFormData>({
    defaultValues: {
      teamMemberId: '',
      reimbursementAmount: '',
      reimbursementDate: '',
      payrolId: '',
      reimbursementFrequency: '',
    },
  });

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

  // Load payrol periods for selection (optional field)
  useEffect(() => {
    if (open) {
      setLoadingPayrols(true);
      apiGet<PayrolDTO[]>('/api/payrol')
        .then((data) => setPayrols(data))
        .catch(() => toast({ title: 'Error', description: 'Failed to load payrol periods', variant: 'destructive' }))
        .finally(() => setLoadingPayrols(false));
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      if (record) {
        reset({
          teamMemberId: record.teamMemberId.toString(),
          reimbursementAmount: record.reimbursementAmount,
          reimbursementDate: record.reimbursementDate.slice(0, 7),
          payrolId: record.payrolId?.toString() ?? '',
          reimbursementFrequency: record.reimbursementFrequency?.toString() ?? '',
        });
      } else {
        reset({
          teamMemberId: '',
          reimbursementAmount: '',
          reimbursementDate: '',
          payrolId: '',
          reimbursementFrequency: '',
        });
      }
    }
  }, [open, record, reset]);

  const onSubmit = async (data: ReimbursementFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateTeamMemberReimbursementDTO = {
          teamMemberId: Number(data.teamMemberId),
          reimbursementAmount: Number(data.reimbursementAmount),
          reimbursementDate: `${data.reimbursementDate}-01`,
          payrolId: data.payrolId ? Number(data.payrolId) : null,
          reimbursementFrequency: data.reimbursementFrequency ? Number(data.reimbursementFrequency) : null,
        };
        const updated = await apiPut<TeamMemberReimbursementDTO, UpdateTeamMemberReimbursementDTO>(
          `/api/team-member-reimbursements/${record.reimbursementId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Reimbursement updated successfully' });
        onUpdated?.(updated);
      } else {
        const payload: CreateTeamMemberReimbursementDTO = {
          teamMemberId: Number(data.teamMemberId),
          reimbursementAmount: Number(data.reimbursementAmount),
          reimbursementDate: `${data.reimbursementDate}-01`,
          payrolId: data.payrolId ? Number(data.payrolId) : null,
          reimbursementFrequency: data.reimbursementFrequency ? Number(data.reimbursementFrequency) : null,
        };
        const created = await apiPost<TeamMemberReimbursementDTO, CreateTeamMemberReimbursementDTO>(
          '/api/team-member-reimbursements',
          payload,
        );
        toast({ title: 'Success', description: 'Reimbursement created successfully' });
        onCreated?.(created);
      }

      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} reimbursement`;
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const formatTeamMemberOption = (tm: TeamMemberDTO) => {
    const name = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`;
    return tm.workdayId ? `${tm.workdayId} - ${name}` : name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Reimbursement' : 'New Reimbursement'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the reimbursement information below.'
              : 'Fill in the details to register a new reimbursement.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Team Member <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="teamMemberId"
                control={control}
                rules={{ required: 'Team member is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={teamMembers.map((tm): ComboBoxOption => ({
                      value: tm.teamMemberId.toString(),
                      label: formatTeamMemberOption(tm),
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={loadingTeamMembers ? 'Loading...' : 'Select a team member'}
                    searchPlaceholder="Search team members..."
                    emptyMessage="No team members found."
                    disabled={loadingTeamMembers}
                  />
                )}
              />
              {errors.teamMemberId && (
                <p className="text-sm text-destructive">{errors.teamMemberId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reimbursementAmount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reimbursementAmount"
                type="number"
                step="0.01"
                min="0"
                {...register('reimbursementAmount', {
                  required: 'Amount is required',
                  min: { value: 0, message: 'Amount must be positive' },
                })}
              />
              {errors.reimbursementAmount && (
                <p className="text-sm text-destructive">{errors.reimbursementAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reimbursementDate">
                Month <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reimbursementDate"
                type="month"
                {...register('reimbursementDate', { required: 'Month is required' })}
              />
              {errors.reimbursementDate && (
                <p className="text-sm text-destructive">{errors.reimbursementDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payrol Period</Label>
              <Controller
                name="payrolId"
                control={control}
                render={({ field }) => (
                  <ComboBox
                    options={payrols.map((p): ComboBoxOption => ({
                      value: p.prlId.toString(),
                      label: `${p.prlDescription} (${p.prlMonth}/${p.prlYear})`,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={loadingPayrols ? 'Loading...' : 'None'}
                    searchPlaceholder="Search payrol periods..."
                    emptyMessage="No payrol periods found."
                    disabled={loadingPayrols}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reimbursementFrequency">Frequency</Label>
              <Input
                id="reimbursementFrequency"
                type="number"
                {...register('reimbursementFrequency')}
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
            <Button type="submit" disabled={isSubmitting || loadingTeamMembers}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

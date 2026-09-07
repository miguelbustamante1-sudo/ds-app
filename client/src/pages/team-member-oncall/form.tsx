import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type {
  TeamMemberOncallDTO,
  CreateTeamMemberOncallDTO,
  UpdateTeamMemberOncallDTO,
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

interface OncallFormData {
  teamMemberId: string;
  oncallAmount: string;
  oncallDate: string;
  payrolId: string;
  oncallFrequency: string;
}

interface OncallFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: TeamMemberOncallDTO;
  onSuccess: () => void;
  onCreated?: (item: TeamMemberOncallDTO) => void;
  onUpdated?: (item: TeamMemberOncallDTO) => void;
}

export function OncallFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
  onCreated,
  onUpdated,
}: OncallFormDialogProps) {
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
  } = useForm<OncallFormData>({
    defaultValues: {
      teamMemberId: '',
      oncallAmount: '',
      oncallDate: '',
      payrolId: '',
      oncallFrequency: '',
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
          oncallAmount: record.oncallAmount,
          oncallDate: record.oncallDate.slice(0, 7),
          payrolId: record.payrolId?.toString() ?? '',
          oncallFrequency: record.oncallFrequency?.toString() ?? '',
        });
      } else {
        reset({
          teamMemberId: '',
          oncallAmount: '',
          oncallDate: '',
          payrolId: '',
          oncallFrequency: '',
        });
      }
    }
  }, [open, record, reset]);

  const onSubmit = async (data: OncallFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateTeamMemberOncallDTO = {
          teamMemberId: Number(data.teamMemberId),
          oncallAmount: Number(data.oncallAmount),
          oncallDate: `${data.oncallDate}-01`,
          payrolId: data.payrolId ? Number(data.payrolId) : null,
          oncallFrequency: data.oncallFrequency ? Number(data.oncallFrequency) : null,
        };
        const updated = await apiPut<TeamMemberOncallDTO, UpdateTeamMemberOncallDTO>(
          `/api/team-member-oncall/${record.oncallId}`,
          payload,
        );
        toast({ title: 'Success', description: 'On call record updated successfully' });
        onUpdated?.(updated);
      } else {
        const payload: CreateTeamMemberOncallDTO = {
          teamMemberId: Number(data.teamMemberId),
          oncallAmount: Number(data.oncallAmount),
          oncallDate: `${data.oncallDate}-01`,
          payrolId: data.payrolId ? Number(data.payrolId) : null,
          oncallFrequency: data.oncallFrequency ? Number(data.oncallFrequency) : null,
        };
        const created = await apiPost<TeamMemberOncallDTO, CreateTeamMemberOncallDTO>(
          '/api/team-member-oncall',
          payload,
        );
        toast({ title: 'Success', description: 'On call record created successfully' });
        onCreated?.(created);
      }

      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} on call record`;
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
          <DialogTitle>{isEditing ? 'Edit On Call' : 'New On Call'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the on call information below.'
              : 'Fill in the details to register a new on call record.'}
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
              <Label htmlFor="oncallAmount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="oncallAmount"
                type="number"
                step="0.01"
                min="0"
                {...register('oncallAmount', {
                  required: 'Amount is required',
                  min: { value: 0, message: 'Amount must be positive' },
                })}
              />
              {errors.oncallAmount && (
                <p className="text-sm text-destructive">{errors.oncallAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="oncallDate">
                Month <span className="text-destructive">*</span>
              </Label>
              <Input
                id="oncallDate"
                type="month"
                {...register('oncallDate', { required: 'Month is required' })}
              />
              {errors.oncallDate && (
                <p className="text-sm text-destructive">{errors.oncallDate.message}</p>
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
              <Label htmlFor="oncallFrequency">Frequency</Label>
              <Input
                id="oncallFrequency"
                type="number"
                {...register('oncallFrequency')}
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

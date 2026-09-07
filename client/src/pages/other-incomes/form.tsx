import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type {
  OtherIncomeDTO,
  CreateOtherIncomeDTO,
  UpdateOtherIncomeDTO,
  IncomeTypeDTO,
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

interface OtherIncomeFormData {
  teamMemberId: string;
  incomeTypeId: string;
  oinAmount: string;
  oinCuantity: string;
  oinMeasurment: string;
  payrolId: string;
  authorizerId: string;
}

/** Minimal shape both /api/team-members and /api/team-members/my-reports responses satisfy. */
interface TeamMemberOption {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

interface OtherIncomeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: OtherIncomeDTO;
  onSuccess: () => void;
  onCreated?: (item: OtherIncomeDTO) => void;
  onUpdated?: (item: OtherIncomeDTO) => void;
  /**
   * Admin mode (used by the other-incomes-admin page, PLAN-08): the team-member
   * ComboBox lists every team member org-wide instead of just the caller's reports,
   * and editing an existing entry exposes an editable Authorizer ComboBox instead
   * of the read-only display. Authorizer is never settable at creation time, even
   * for admins — it's always auto-resolved server-side; only an edit can override it.
   */
  isAdmin?: boolean;
}

export function OtherIncomeFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
  onCreated,
  onUpdated,
  isAdmin = false,
}: OtherIncomeFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [incomeTypes, setIncomeTypes] = useState<IncomeTypeDTO[]>([]);
  const [payrolPeriods, setPayrolPeriods] = useState<{ prlId: number; prlDescription: string; prlMonth: number; prlYear: number }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<OtherIncomeFormData>({
    defaultValues: {
      teamMemberId: '',
      incomeTypeId: '',
      oinAmount: '',
      oinCuantity: '',
      oinMeasurment: '',
      payrolId: '',
      authorizerId: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    const teamMemberEndpoint = isAdmin ? '/api/team-members' : '/api/team-members/my-reports?hierarchy=complete';
    Promise.all([
      apiGet<TeamMemberOption[]>(teamMemberEndpoint),
      apiGet<IncomeTypeDTO[]>('/api/income-types/active'),
      apiGet<{ prlId: number; prlDescription: string; prlMonth: number; prlYear: number }[]>('/api/other-incomes/lookups/payrol-periods'),
    ])
      .then(([tm, it, prl]) => {
        setTeamMembers(tm);
        setIncomeTypes(it);
        setPayrolPeriods(prl);
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load form options', variant: 'destructive' }))
      .finally(() => setLoadingOptions(false));
  }, [open, isAdmin, toast]);

  useEffect(() => {
    if (!open) return;
    if (record) {
      // record.teamMember/authorizer are the joined team member rows' own fields —
      // their teamMemberId is the same internal id the ComboBox is keyed on, so no
      // lookup against the separately-fetched teamMembers list is needed here.
      reset({
        teamMemberId: record.teamMember.teamMemberId.toString(),
        incomeTypeId: record.incomeTypeId.toString(),
        oinAmount: record.oinAmount,
        oinCuantity: record.oinCuantity,
        oinMeasurment: record.oinMeasurment,
        payrolId: record.payrolId.toString(),
        authorizerId: record.authorizer.teamMemberId.toString(),
      });
    } else {
      reset({
        teamMemberId: '',
        incomeTypeId: '',
        oinAmount: '',
        oinCuantity: '',
        oinMeasurment: '',
        payrolId: '',
        authorizerId: '',
      });
    }
  }, [open, record, reset]);

  const onSubmit = async (data: OtherIncomeFormData) => {
    try {
      // The ComboBoxes still pick team members by internal id (for display/search
      // consistency with the rest of the app) — resolve to Workday IDs here, since
      // oin_other_incomes keys on wdid, not tms_id.
      const teamMember = teamMembers.find((tm) => tm.teamMemberId.toString() === data.teamMemberId);
      if (!teamMember?.workdayId) {
        toast({
          title: 'Error',
          description: 'The selected team member has no Workday ID on file',
          variant: 'destructive',
        });
        return;
      }

      if (isEditing && record) {
        const payload: UpdateOtherIncomeDTO = {
          teamMemberWdid: teamMember.workdayId,
          incomeTypeId: Number(data.incomeTypeId),
          oinAmount: Number(data.oinAmount),
          oinCuantity: data.oinCuantity,
          oinMeasurment: data.oinMeasurment,
          payrolId: Number(data.payrolId),
        };
        if (isAdmin && data.authorizerId) {
          const authorizer = teamMembers.find((tm) => tm.teamMemberId.toString() === data.authorizerId);
          if (!authorizer?.workdayId) {
            toast({
              title: 'Error',
              description: 'The selected authorizer has no Workday ID on file',
              variant: 'destructive',
            });
            return;
          }
          payload.authorizerWdid = authorizer.workdayId;
        }
        const updated = await apiPut<OtherIncomeDTO, UpdateOtherIncomeDTO>(`/api/other-incomes/${record.oinId}`, payload);
        toast({ title: 'Success', description: 'Entry updated successfully' });
        onUpdated?.(updated);
      } else {
        const payload: CreateOtherIncomeDTO = {
          teamMemberWdid: teamMember.workdayId,
          incomeTypeId: Number(data.incomeTypeId),
          oinAmount: Number(data.oinAmount),
          oinCuantity: data.oinCuantity,
          oinMeasurment: data.oinMeasurment,
          payrolId: Number(data.payrolId),
        };
        const created = await apiPost<OtherIncomeDTO, CreateOtherIncomeDTO>('/api/other-incomes', payload);
        toast({ title: 'Success', description: 'Entry created successfully' });
        onCreated?.(created);
      }
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} entry`;
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const formatTeamMemberOption = (tm: TeamMemberOption) => {
    const name = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`;
    return tm.workdayId ? `${tm.workdayId} - ${name}` : name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Entry' : 'New Entry'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the entry below.' : 'Fill in the details to submit a new other income entry.'}
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
                    placeholder={loadingOptions ? 'Loading...' : 'Select a team member'}
                    searchPlaceholder="Search team members..."
                    emptyMessage="No team members found."
                    disabled={loadingOptions}
                  />
                )}
              />
              {errors.teamMemberId && <p className="text-sm text-destructive">{errors.teamMemberId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>
                Income Type <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="incomeTypeId"
                control={control}
                rules={{ required: 'Income type is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={incomeTypes.map((it): ComboBoxOption => ({
                      value: it.incomeTypeId.toString(),
                      label: it.incomeTypeName,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={loadingOptions ? 'Loading...' : 'Select an income type'}
                    searchPlaceholder="Search income types..."
                    emptyMessage="No income types found."
                    disabled={loadingOptions}
                  />
                )}
              />
              {errors.incomeTypeId && <p className="text-sm text-destructive">{errors.incomeTypeId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="oinAmount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="oinAmount"
                  type="number"
                  step="0.01"
                  {...register('oinAmount', { required: 'Amount is required' })}
                />
                {errors.oinAmount && <p className="text-sm text-destructive">{errors.oinAmount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="oinCuantity">
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input id="oinCuantity" {...register('oinCuantity', { required: 'Quantity is required' })} />
                {errors.oinCuantity && <p className="text-sm text-destructive">{errors.oinCuantity.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="oinMeasurment">
                Measurement <span className="text-destructive">*</span>
              </Label>
              <Input
                id="oinMeasurment"
                placeholder="e.g. hours, days"
                {...register('oinMeasurment', { required: 'Measurement is required' })}
              />
              {errors.oinMeasurment && <p className="text-sm text-destructive">{errors.oinMeasurment.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>
                Payrol Period <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="payrolId"
                control={control}
                rules={{ required: 'Payrol period is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={payrolPeriods.map((p): ComboBoxOption => ({
                      value: p.prlId.toString(),
                      label: `${p.prlDescription} (${p.prlMonth}/${p.prlYear})`,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={loadingOptions ? 'Loading...' : 'Select an open payrol period'}
                    searchPlaceholder="Search payrol periods..."
                    emptyMessage="No open payrol periods found."
                    disabled={loadingOptions}
                  />
                )}
              />
              {errors.payrolId && <p className="text-sm text-destructive">{errors.payrolId.message}</p>}
            </div>

            {isEditing && record && !isAdmin && (
              <div className="space-y-2">
                <Label>Authorizer</Label>
                <p className="text-sm text-muted-foreground">
                  {record.authorizer.teamMemberNames} {record.authorizer.teamMemberSurnames} (auto-assigned; only an
                  admin can change this)
                </p>
              </div>
            )}

            {isEditing && isAdmin && (
              <div className="space-y-2">
                <Label>Authorizer (admin override)</Label>
                <Controller
                  name="authorizerId"
                  control={control}
                  render={({ field }) => (
                    <ComboBox
                      options={teamMembers.map((tm): ComboBoxOption => ({
                        value: tm.teamMemberId.toString(),
                        label: formatTeamMemberOption(tm),
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={loadingOptions ? 'Loading...' : 'Select an authorizer'}
                      searchPlaceholder="Search team members..."
                      emptyMessage="No team members found."
                      disabled={loadingOptions}
                    />
                  )}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loadingOptions}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

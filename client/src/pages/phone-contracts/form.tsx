import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type {
  CreatePhoneContractDTO,
  UpdatePhoneContractDTO,
  PhoneContractDTO,
  TeamMemberDTO,
  CountryDTO,
} from '@shared/dto';
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
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';

interface PhoneContractFormData {
  phoneNumber: string;
  contractStartDate: string;
  contractMonths: string;
  actualCostRate: string;
  countryId: string;
  comments: string;
  teamMemberId: string;
  billable: boolean;
  isFree: boolean;
  billRate: string;
  cellphonePrice: string;
  remarks: string;
  phoneType: string;
}

interface PhoneContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: PhoneContractDTO;
  onSuccess: () => void;
}

export function PhoneContractFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: PhoneContractFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;

  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PhoneContractFormData>({
    defaultValues: {
      phoneNumber:       '',
      contractStartDate: '',
      contractMonths:    '',
      actualCostRate:    '',
      countryId:         '',
      comments:          '',
      teamMemberId:      '',
      billable:          true,
      isFree:            false,
      billRate:          '',
      cellphonePrice:    '',
      remarks:           '',
      phoneType:         '',
    },
  });

  const watchedTeamMemberId = watch('teamMemberId');
  const watchedCountryId    = watch('countryId');
  const watchedIsFree       = watch('isFree');

  const teamMemberOptions: ComboBoxOption[] = teamMembers.map((m) => ({
    value: m.teamMemberId.toString(),
    label: m.workdayId
      ? `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`
      : `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));

  const countryOptions: ComboBoxOption[] = countries.map((c) => ({
    value: c.countryId.toString(),
    label: c.countryName,
  }));

  useEffect(() => {
    if (!open) return;

    if (record) {
      reset({
        phoneNumber:       record.phoneNumber,
        contractStartDate: record.contractStartDate
          ? String(record.contractStartDate).slice(0, 10)
          : '',
        contractMonths:    record.contractMonths?.toString() ?? '',
        actualCostRate:    record.actualCostRate?.toString() ?? '',
        countryId:         record.countryId?.toString() ?? '',
        comments:          record.comments ?? '',
        teamMemberId:      record.activeAssignment?.teamMemberId.toString() ?? '',
        billable:          record.activeAssignment?.billable ?? true,
        isFree:            record.activeAssignment?.isFree ?? false,
        billRate:          record.activeAssignment?.billRate.toString() ?? '',
        cellphonePrice:    record.activeAssignment?.cellphonePrice.toString() ?? '',
        remarks:           record.activeAssignment?.remarks ?? '',
        phoneType:         record.activeAssignment?.phoneType ?? '',
      });
    } else {
      reset({
        phoneNumber:       '',
        contractStartDate: '',
        contractMonths:    '',
        actualCostRate:    '',
        countryId:         '',
        comments:          '',
        teamMemberId:      '',
        billable:          true,
        isFree:            false,
        billRate:          '',
        cellphonePrice:    '',
        remarks:           '',
        phoneType:         '',
      });
    }

    setLoadingOptions(true);
    Promise.all([
      apiGet<TeamMemberDTO[]>('/api/team-members'),
      apiGet<CountryDTO[]>('/api/countries'),
    ])
      .then(([members, ctries]) => {
        setTeamMembers(members);
        setCountries(ctries);
      })
      .catch(() =>
        toast({ title: 'Error', description: 'Failed to load form options', variant: 'destructive' }),
      )
      .finally(() => setLoadingOptions(false));
  }, [open, record, reset, toast]);

  const onSubmit = async (data: PhoneContractFormData) => {
    if (!data.teamMemberId) {
      toast({
        title: 'Validation Error',
        description: 'Please select an assigned team member',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isEditing && record) {
        const payload: UpdatePhoneContractDTO = {
          contractStartDate: data.contractStartDate,
          contractMonths:    data.contractMonths ? Number(data.contractMonths) : null,
          actualCostRate:    data.actualCostRate ? Number(data.actualCostRate) : null,
          countryId:         data.countryId ? Number(data.countryId) : null,
          comments:          data.comments.trim() || null,
          teamMemberId:      Number(data.teamMemberId),
          billable:          data.billable,
          isFree:            data.isFree,
          billRate:          Number(data.billRate),
          cellphonePrice:    data.cellphonePrice ? Number(data.cellphonePrice) : 0,
          remarks:           data.remarks.trim() || null,
          phoneType:         data.phoneType.trim() || null,
        };
        await apiPut<PhoneContractDTO, UpdatePhoneContractDTO>(
          `/api/phone-contracts/${record.phoneLineId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Phone contract updated successfully' });
      } else {
        const payload: CreatePhoneContractDTO = {
          phoneNumber:       data.phoneNumber.trim(),
          contractStartDate: data.contractStartDate,
          contractMonths:    data.contractMonths ? Number(data.contractMonths) : null,
          actualCostRate:    data.actualCostRate ? Number(data.actualCostRate) : null,
          countryId:         data.countryId ? Number(data.countryId) : null,
          comments:          data.comments.trim() || null,
          teamMemberId:      Number(data.teamMemberId),
          billable:          data.billable,
          isFree:            data.isFree,
          billRate:          Number(data.billRate),
          cellphonePrice:    data.cellphonePrice ? Number(data.cellphonePrice) : 0,
          remarks:           data.remarks.trim() || null,
          phoneType:         data.phoneType.trim() || null,
        };
        await apiPost<PhoneContractDTO, CreatePhoneContractDTO>('/api/phone-contracts', payload);
        toast({ title: 'Success', description: 'Phone contract created successfully' });
      }
      onSuccess();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} phone contract`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Phone Contract' : 'New Phone Contract'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          <div className="space-y-3 py-2">

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone Information</p>

            {/* Phone Number | Country | Contract Start */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  placeholder="+1 555 000 0000"
                  disabled={isEditing}
                  autoComplete="off"
                  {...register('phoneNumber', { required: !isEditing && 'Required' })}
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Country</Label>
                <ComboBox
                  options={countryOptions}
                  value={watchedCountryId}
                  onValueChange={(value) => setValue('countryId', value)}
                  placeholder="Select..."
                  searchPlaceholder="Search countries..."
                  emptyMessage="No countries found."
                  disabled={loadingOptions}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contractStartDate">
                  Contract Start <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contractStartDate"
                  type="date"
                  autoComplete="off"
                  {...register('contractStartDate', { required: 'Required' })}
                />
                {errors.contractStartDate && (
                  <p className="text-xs text-destructive">{errors.contractStartDate.message}</p>
                )}
              </div>
            </div>

            {/* Months | Cost Rate | Comments */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contractMonths">Months</Label>
                <Input
                  id="contractMonths"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 12"
                  autoComplete="off"
                  {...register('contractMonths', {
                    min: { value: 1, message: 'Min 1' },
                    validate: (v) => !v || Number.isInteger(Number(v)) || 'Whole number',
                  })}
                />
                {errors.contractMonths && (
                  <p className="text-xs text-destructive">{errors.contractMonths.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="actualCostRate">Cost Rate</Label>
                <Input
                  id="actualCostRate"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  autoComplete="off"
                  {...register('actualCostRate', {
                    min: { value: 0, message: 'Min 0' },
                  })}
                />
                {errors.actualCostRate && (
                  <p className="text-xs text-destructive">{errors.actualCostRate.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comments">Comments</Label>
                <Input
                  id="comments"
                  placeholder="Optional notes..."
                  autoComplete="off"
                  {...register('comments')}
                />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">Assignment</p>

            {/* Assigned To */}
            <div className="space-y-1.5">
              <Label>
                Assigned To <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={teamMemberOptions}
                value={watchedTeamMemberId}
                onValueChange={(value) => setValue('teamMemberId', value)}
                placeholder="Select a team member..."
                searchPlaceholder="Search team members..."
                emptyMessage="No team members found."
                disabled={loadingOptions}
              />
            </div>

            {/* Bill Rate | Cellphone Price | Phone Type | Billable | Is Free */}
            <div className="grid grid-cols-5 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="billRate">
                  Bill Rate {!watchedIsFree && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="billRate"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  autoComplete="off"
                  {...register('billRate', {
                    required: watchedIsFree ? false : 'Required',
                    min: { value: 0, message: 'Min 0' },
                  })}
                />
                {errors.billRate && (
                  <p className="text-xs text-destructive">{errors.billRate.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cellphonePrice">Cellphone Price</Label>
                <Input
                  id="cellphonePrice"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  autoComplete="off"
                  {...register('cellphonePrice', {
                    min: { value: 0, message: 'Min 0' },
                  })}
                />
                {errors.cellphonePrice && (
                  <p className="text-xs text-destructive">{errors.cellphonePrice.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phoneType">Phone Type</Label>
                <Input
                  id="phoneType"
                  placeholder="e.g. Samsung S26"
                  autoComplete="off"
                  {...register('phoneType')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billable">Billable</Label>
                <div className="flex items-center h-9">
                  <Controller
                    name="billable"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="billable"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="isFree">Free</Label>
                <div className="flex items-center h-9">
                  <Controller
                    name="isFree"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="isFree"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                placeholder="Optional..."
                autoComplete="off"
                {...register('remarks')}
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
            <Button type="submit" disabled={isSubmitting || loadingOptions}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

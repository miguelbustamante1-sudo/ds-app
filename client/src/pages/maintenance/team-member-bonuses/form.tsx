import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import type {
  TeamMemberBonusDTO,
  CreateTeamMemberBonusDTO,
  UpdateTeamMemberBonusDTO,
  BonusCategoryDTO,
} from '@shared/dto';
import type { TeamMemberDTO } from '@shared/dto';
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
import { parseUTCDateAsLocal } from '@/lib/utils';

const PERIODICITY_OPTIONS: ComboBoxOption[] = [
  { value: 'MONTHLY',   label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL',    label: 'Annual' },
  { value: 'ONE_TIME',  label: 'One-time' },
];

interface TeamMemberBonusFormData {
  teamMemberId:    string;
  bonusCategoryId: string;
  bonusAmount:     string;
  bonusPeriodicity: string;
  bonusStartDate:  string;
  bonusEndDate:    string;
}

interface TeamMemberBonusFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: TeamMemberBonusDTO;
  onSuccess: () => void;
  onCreated?: (item: TeamMemberBonusDTO) => void;
  onUpdated?: (item: TeamMemberBonusDTO) => void;
}

export function TeamMemberBonusFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
  onCreated,
  onUpdated,
}: TeamMemberBonusFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;
  const [teamMembers, setTeamMembers]       = useState<TeamMemberDTO[]>([]);
  const [bonusCategories, setBonusCategories] = useState<BonusCategoryDTO[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TeamMemberBonusFormData>({
    defaultValues: {
      teamMemberId:    '',
      bonusCategoryId: '',
      bonusAmount:     '',
      bonusPeriodicity: '',
      bonusStartDate:  '',
      bonusEndDate:    '',
    },
  });

  // Load reference data when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([
      apiGet<TeamMemberDTO[]>('/api/team-members'),
      apiGet<BonusCategoryDTO[]>('/api/bonus-categories'),
    ])
      .then(([tms, cats]) => {
        setTeamMembers(tms);
        setBonusCategories(cats);
      })
      .catch(() =>
        toast({ title: 'Error', description: 'Failed to load options', variant: 'destructive' }),
      )
      .finally(() => setLoadingOptions(false));
  }, [open, toast]);

  // Reset form fields when dialog opens or editing record changes
  useEffect(() => {
    if (!open) return;
    reset({
      teamMemberId:    record?.teamMemberId?.toString()    ?? '',
      bonusCategoryId: record?.bonusCategoryId?.toString() ?? '',
      bonusAmount:     record?.bonusAmount?.toString()     ?? '',
      bonusPeriodicity: record?.bonusPeriodicity           ?? '',
      // Use parseUTCDateAsLocal to avoid timezone-induced day shift (Rule 3.8)
      bonusStartDate: record?.bonusStartDate
        ? format(parseUTCDateAsLocal(record.bonusStartDate as string), 'yyyy-MM-dd')
        : '',
      bonusEndDate: record?.bonusEndDate
        ? format(parseUTCDateAsLocal(record.bonusEndDate as string), 'yyyy-MM-dd')
        : '',
    });
  }, [open, record, reset]);

  const onSubmit = async (data: TeamMemberBonusFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateTeamMemberBonusDTO = {
          bonusCategoryId:  Number(data.bonusCategoryId),
          bonusAmount:      Number(data.bonusAmount),
          bonusPeriodicity: data.bonusPeriodicity,
          bonusStartDate:   data.bonusStartDate || null,
          bonusEndDate:     data.bonusEndDate   || null,
        };
        const updated = await apiPut<TeamMemberBonusDTO, UpdateTeamMemberBonusDTO>(
          `/api/team-member-bonuses/${record.teamMemberBonusId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Bonus updated successfully' });
        onUpdated?.(updated);
      } else {
        const payload: CreateTeamMemberBonusDTO = {
          teamMemberId:    Number(data.teamMemberId),
          bonusCategoryId: Number(data.bonusCategoryId),
          bonusAmount:     Number(data.bonusAmount),
          bonusPeriodicity: data.bonusPeriodicity,
          bonusStartDate:  data.bonusStartDate || null,
          bonusEndDate:    data.bonusEndDate   || null,
        };
        const created = await apiPost<TeamMemberBonusDTO, CreateTeamMemberBonusDTO>(
          '/api/team-member-bonuses',
          payload,
        );
        toast({ title: 'Success', description: 'Bonus created successfully' });
        onCreated?.(created);
      }
      onSuccess();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? 'update' : 'create'} bonus`;
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Bonus' : 'New Bonus'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the bonus details below.'
              : 'Fill in the details to create a new team member bonus.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">

            {/* Team Member — create only; cannot change owner after creation */}
            {!isEditing && (
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
                        label: tm.workdayId
                          ? `${tm.workdayId} - ${tm.teamMemberNames} ${tm.teamMemberSurnames}`
                          : `${tm.teamMemberNames} ${tm.teamMemberSurnames}`,
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
                {errors.teamMemberId && (
                  <p className="text-sm text-destructive">{errors.teamMemberId.message}</p>
                )}
              </div>
            )}

            {/* Bonus Category */}
            <div className="space-y-2">
              <Label>
                Bonus Category <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="bonusCategoryId"
                control={control}
                rules={{ required: 'Bonus category is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={bonusCategories.map((c): ComboBoxOption => ({
                      value: c.bonusCategoryId.toString(),
                      label: c.bonusCategoryName,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={loadingOptions ? 'Loading...' : 'Select a category'}
                    searchPlaceholder="Search categories..."
                    emptyMessage="No categories found."
                    disabled={loadingOptions}
                  />
                )}
              />
              {errors.bonusCategoryId && (
                <p className="text-sm text-destructive">{errors.bonusCategoryId.message}</p>
              )}
            </div>

            {/* Amount + Periodicity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bonusAmount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bonusAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('bonusAmount', { required: 'Amount is required' })}
                />
                {errors.bonusAmount && (
                  <p className="text-sm text-destructive">{errors.bonusAmount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Periodicity <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="bonusPeriodicity"
                  control={control}
                  rules={{ required: 'Periodicity is required' }}
                  render={({ field }) => (
                    <ComboBox
                      options={PERIODICITY_OPTIONS}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select periodicity"
                      searchPlaceholder="Search..."
                      emptyMessage="No options found."
                    />
                  )}
                />
                {errors.bonusPeriodicity && (
                  <p className="text-sm text-destructive">{errors.bonusPeriodicity.message}</p>
                )}
              </div>
            </div>

            {/* Start Date + End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bonusStartDate">Start Date</Label>
                <Input id="bonusStartDate" type="date" {...register('bonusStartDate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonusEndDate">End Date</Label>
                <Input id="bonusEndDate" type="date" {...register('bonusEndDate')} />
                <p className="text-sm text-muted-foreground">Leave empty for open-ended bonuses</p>
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
            <Button type="submit" disabled={isSubmitting || loadingOptions}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

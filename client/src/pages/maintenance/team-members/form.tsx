import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { TeamMemberDTO, CreateTeamMemberDTO, UpdateTeamMemberDTO, CountryDTO, PositionDTO, TierBandDTO } from '@shared/dto';
import { getShifts, type ShiftDTO } from '@/services/shift';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';

interface TeamMemberFormData {
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string;
  teamMemberFullLegalName: string;
  teamMemberStartDate: string;
  teamMemberEndDate: string;
  countryId: string;
  teamMemberPrimaryRole: string;
  tierBandId: string;
  workdayId: string;
  teamMemberXid: string;
  shiftId: string;
}

interface TeamMemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMember?: TeamMemberDTO;
  onSuccess: () => void;
}

export function TeamMemberFormDialog({
  open,
  onOpenChange,
  teamMember,
  onSuccess,
}: TeamMemberFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!teamMember;

  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [roles, setRoles] = useState<PositionDTO[]>([]);
  const [tierBands, setTierBands] = useState<TierBandDTO[]>([]);
  const [shifts, setShifts] = useState<ShiftDTO[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingTierBands, setLoadingTierBands] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<TeamMemberFormData | null>(null);
  const [showEndDateConfirm, setShowEndDateConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TeamMemberFormData>({
    defaultValues: {
      teamMemberNames: '',
      teamMemberSurnames: '',
      teamMemberKnownAs: '',
      teamMemberFullLegalName: '',
      teamMemberStartDate: '',
      teamMemberEndDate: '',
      countryId: '',
      teamMemberPrimaryRole: '',
      tierBandId: '',
      workdayId: '',
      teamMemberXid: '',
      shiftId: '',
    },
  });

  // Register tierBandId for validation (controlled by ComboBox via setValue)
  register('tierBandId', { required: 'Tier band is required' });

  const watchedCountryId      = watch('countryId');
  const watchedPrimaryRole    = watch('teamMemberPrimaryRole');
  const watchedTierBandId     = watch('tierBandId');
  const watchedShiftId        = watch('shiftId');

  const countryOptions: ComboBoxOption[] = countries.map((c) => ({
    value: c.countryId.toString(),
    label: c.countryName,
  }));

  const roleOptions: ComboBoxOption[] = roles.map((r) => ({
    value: r.posId.toString(),
    label: r.posName,
  }));

  const tierBandOptions: ComboBoxOption[] = tierBands.map((t) => ({
    value: t.tierBandId.toString(),
    label: t.tierBandDescription,
  }));

  const shiftOptions: ComboBoxOption[] = shifts.map((s) => ({
    value: s.shiftId.toString(),
    label: s.description,
  }));

  useEffect(() => {
    if (open) {
      setLoadingCountries(true);
      apiGet<CountryDTO[]>('/api/countries')
        .then((data) => setCountries(data))
        .catch(() => toast({ title: 'Error', description: 'Failed to load countries', variant: 'destructive' }))
        .finally(() => setLoadingCountries(false));

      setLoadingRoles(true);
      apiGet<PositionDTO[]>('/api/positions')
        .then((data) => setRoles(data))
        .catch(() => toast({ title: 'Error', description: 'Failed to load roles', variant: 'destructive' }))
        .finally(() => setLoadingRoles(false));

      setLoadingTierBands(true);
      apiGet<TierBandDTO[]>('/api/tier-bands')
        .then((data) => setTierBands(data))
        .catch(() => toast({ title: 'Error', description: 'Failed to load tier bands', variant: 'destructive' }))
        .finally(() => setLoadingTierBands(false));

      setLoadingShifts(true);
      getShifts()
        .then(setShifts)
        .catch(() => toast({ title: 'Error', description: 'Failed to load shifts', variant: 'destructive' }))
        .finally(() => setLoadingShifts(false));
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      if (teamMember) {
        const startDate = teamMember.teamMemberStartDate
          ? formatUTCDate(teamMember.teamMemberStartDate, 'yyyy-MM-dd')
          : '';
        const endDate = teamMember.teamMemberEndDate
          ? formatUTCDate(teamMember.teamMemberEndDate, 'yyyy-MM-dd')
          : '';
        reset({
          teamMemberNames: teamMember.teamMemberNames,
          teamMemberSurnames: teamMember.teamMemberSurnames,
          teamMemberKnownAs: teamMember.teamMemberKnownAs || '',
          teamMemberFullLegalName: teamMember.teamMemberFullLegalName || '',
          teamMemberStartDate: startDate,
          teamMemberEndDate: endDate,
          countryId: teamMember.countryId?.toString() || '',
          teamMemberPrimaryRole: teamMember.teamMemberPrimaryRole?.toString() || '',
          tierBandId: teamMember.tierBandId?.toString() || '',
          workdayId: teamMember.workdayId || '',
          teamMemberXid: teamMember.teamMemberXid || '',
          shiftId: teamMember.shiftId?.toString() || '',
        });
      } else {
        reset({
          teamMemberNames: '',
          teamMemberSurnames: '',
          teamMemberKnownAs: '',
          teamMemberFullLegalName: '',
          teamMemberStartDate: '',
          teamMemberEndDate: '',
          countryId: '',
          teamMemberPrimaryRole: '',
          tierBandId: '',
          workdayId: '',
          teamMemberXid: '',
          shiftId: '',
        });
      }
    }
  }, [open, teamMember, reset]);

  const submitData = async (data: TeamMemberFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateTeamMemberDTO = {
          teamMemberNames: data.teamMemberNames.trim(),
          teamMemberSurnames: data.teamMemberSurnames.trim(),
          teamMemberKnownAs: data.teamMemberKnownAs.trim() || null,
          teamMemberFullLegalName: data.teamMemberFullLegalName.trim() || null,
          teamMemberStartDate: data.teamMemberStartDate,
          teamMemberEndDate: data.teamMemberEndDate || null,
          countryId: data.countryId ? Number(data.countryId) : null,
          teamMemberPrimaryRole: data.teamMemberPrimaryRole ? Number(data.teamMemberPrimaryRole) : null,
          tierBandId: Number(data.tierBandId),
          workdayId: data.workdayId.trim() || null,
          teamMemberXid: data.teamMemberXid.trim() || null,
          shiftId: data.shiftId ? Number(data.shiftId) : null,
        };
        await apiPut<TeamMemberDTO, UpdateTeamMemberDTO>(`/api/team-members/${teamMember.teamMemberId}`, payload);
        toast({
          title: 'Success',
          description: 'Team member updated successfully',
        });
      } else {
        const payload: CreateTeamMemberDTO = {
          teamMemberNames: data.teamMemberNames.trim(),
          teamMemberSurnames: data.teamMemberSurnames.trim(),
          teamMemberKnownAs: data.teamMemberKnownAs.trim() || null,
          teamMemberFullLegalName: data.teamMemberFullLegalName.trim() || null,
          teamMemberStartDate: data.teamMemberStartDate,
          countryId: data.countryId ? Number(data.countryId) : null,
          teamMemberPrimaryRole: data.teamMemberPrimaryRole ? Number(data.teamMemberPrimaryRole) : null,
          tierBandId: Number(data.tierBandId),
          workdayId: data.workdayId.trim() || null,
          teamMemberXid: data.teamMemberXid.trim() || null,
          shiftId: data.shiftId ? Number(data.shiftId) : null,
        };
        await apiPost<TeamMemberDTO, CreateTeamMemberDTO>('/api/team-members', payload);
        toast({
          title: 'Success',
          description: 'Team member created successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} team member`,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: TeamMemberFormData) => {
    // When editing: if the end date is being set or changed, require explicit confirmation
    // because it will automatically cancel all future time-off requests for this member.
    if (isEditing) {
      const originalEndDate = teamMember?.teamMemberEndDate
        ? formatUTCDate(teamMember.teamMemberEndDate, 'yyyy-MM-dd')
        : '';
      const endDateChanged = data.teamMemberEndDate !== originalEndDate && data.teamMemberEndDate !== '';

      if (endDateChanged) {
        setPendingSubmitData(data);
        setShowEndDateConfirm(true);
        return;
      }
    }

    await submitData(data);
  };

  const handleEndDateConfirmed = async () => {
    setShowEndDateConfirm(false);
    if (pendingSubmitData) {
      await submitData(pendingSubmitData);
      setPendingSubmitData(null);
    }
  };

  const memberName = teamMember
    ? `${teamMember.teamMemberKnownAs || teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`
    : '';

  return (
    <>
    <AlertDialog open={showEndDateConfirm} onOpenChange={setShowEndDateConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm end date</AlertDialogTitle>
          <AlertDialogDescription>
            You are setting the end date for <strong>{memberName}</strong> to{' '}
            <strong>{pendingSubmitData?.teamMemberEndDate}</strong>.
            <br /><br />
            All future time-off requests for this team member will be automatically
            cancelled when this date is reached. Please confirm the date is correct
            and not an error.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingSubmitData(null)}>
            Go back
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleEndDateConfirmed}>
            Yes, confirm end date
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Team Member' : 'New Team Member'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the team member information below.'
              : 'Fill in the details to create a new team member.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamMemberNames">
                  Names <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="teamMemberNames"
                  placeholder="e.g., John"
                  {...register('teamMemberNames', {
                    required: 'Names are required',
                    minLength: {
                      value: 2,
                      message: 'Names must be at least 2 characters',
                    },
                  })}
                />
                {errors.teamMemberNames && (
                  <p className="text-sm text-destructive">{errors.teamMemberNames.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamMemberSurnames">
                  Surnames <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="teamMemberSurnames"
                  placeholder="e.g., Doe"
                  {...register('teamMemberSurnames', {
                    required: 'Surnames are required',
                    minLength: {
                      value: 2,
                      message: 'Surnames must be at least 2 characters',
                    },
                  })}
                />
                {errors.teamMemberSurnames && (
                  <p className="text-sm text-destructive">{errors.teamMemberSurnames.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamMemberKnownAs">Known As</Label>
              <Input
                id="teamMemberKnownAs"
                placeholder="e.g., Johnny (Optional)"
                {...register('teamMemberKnownAs')}
              />
              <p className="text-sm text-muted-foreground">
                Preferred name or nickname
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamMemberFullLegalName">Full Legal Name</Label>
              <Input
                id="teamMemberFullLegalName"
                placeholder="e.g., Jonathan Michael Doe (Optional)"
                {...register('teamMemberFullLegalName')}
              />
              <p className="text-sm text-muted-foreground">
                Full legal name as it appears on official documents
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamMemberStartDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="teamMemberStartDate"
                type="date"
                {...register('teamMemberStartDate', {
                  required: 'Start date is required',
                })}
              />
              {errors.teamMemberStartDate && (
                <p className="text-sm text-destructive">{errors.teamMemberStartDate.message}</p>
              )}
            </div>

            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="teamMemberEndDate">End Date</Label>
                <Input
                  id="teamMemberEndDate"
                  type="date"
                  {...register('teamMemberEndDate')}
                />
                <p className="text-sm text-muted-foreground">
                  Leave blank for active members
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="countryId">Country</Label>
                <ComboBox
                  options={countryOptions}
                  value={watchedCountryId}
                  onValueChange={(value) => setValue('countryId', value)}
                  placeholder="Select a country..."
                  searchPlaceholder="Search countries..."
                  emptyMessage="No countries found."
                  disabled={loadingCountries}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamMemberPrimaryRole">Primary Role</Label>
                <ComboBox
                  options={roleOptions}
                  value={watchedPrimaryRole}
                  onValueChange={(value) => setValue('teamMemberPrimaryRole', value)}
                  placeholder="Select a role..."
                  searchPlaceholder="Search roles..."
                  emptyMessage="No roles found."
                  disabled={loadingRoles}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tierBandId">
                  Tier Band <span className="text-destructive">*</span>
                </Label>
                <ComboBox
                  options={tierBandOptions}
                  value={watchedTierBandId}
                  onValueChange={(value) => setValue('tierBandId', value, { shouldValidate: true })}
                  placeholder="Select a tier band..."
                  searchPlaceholder="Search tier bands..."
                  emptyMessage="No tier bands found."
                  disabled={loadingTierBands}
                />
                {errors.tierBandId && (
                  <p className="text-sm text-destructive">{errors.tierBandId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="workdayId">Workday ID</Label>
                <Input
                  id="workdayId"
                  placeholder="e.g., WD-12345"
                  {...register('workdayId')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamMemberXid">External ID</Label>
              <Input
                id="teamMemberXid"
                placeholder="e.g., EXT-001 (Optional)"
                {...register('teamMemberXid')}
              />
              <p className="text-sm text-muted-foreground">
                External system identifier (tms_xid)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Shift</Label>
              <ComboBox
                options={shiftOptions}
                value={watchedShiftId}
                onValueChange={(value) => setValue('shiftId', value)}
                placeholder="Select a shift..."
                searchPlaceholder="Search shifts..."
                emptyMessage="No shifts found."
                disabled={loadingShifts}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

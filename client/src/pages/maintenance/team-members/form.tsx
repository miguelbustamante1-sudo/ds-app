import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { TeamMemberDTO, CreateTeamMemberDTO, UpdateTeamMemberDTO, CountryDTO, RoleDTO } from '@shared/dto';
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

interface TeamMemberFormData {
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string;
  teamMemberSeniority: string;
  teamMemberStartDate: string;
  countryId: string;
  teamMemberPrimaryRole: string;
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

  // State for countries and roles
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [roles, setRoles] = useState<RoleDTO[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

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
      teamMemberSeniority: '',
      teamMemberStartDate: '',
      countryId: '',
      teamMemberPrimaryRole: '',
    },
  });

  // Watch form values for ComboBox
  const watchedCountryId = watch('countryId');
  const watchedPrimaryRole = watch('teamMemberPrimaryRole');

  // ComboBox options
  const countryOptions: ComboBoxOption[] = countries.map((c) => ({
    value: c.countryId.toString(),
    label: c.countryName,
  }));

  const roleOptions: ComboBoxOption[] = roles.map((r) => ({
    value: r.roleId.toString(),
    label: r.roleName,
  }));

  // Load countries and roles when dialog opens
  useEffect(() => {
    if (open) {
      // Load countries
      setLoadingCountries(true);
      apiGet<CountryDTO[]>('/api/countries')
        .then((data) => setCountries(data))
        .catch(() => toast({ title: 'Error', description: 'Failed to load countries', variant: 'destructive' }))
        .finally(() => setLoadingCountries(false));

      // Load roles
      setLoadingRoles(true);
      apiGet<RoleDTO[]>('/api/roles')
        .then((data) => setRoles(data))
        .catch(() => toast({ title: 'Error', description: 'Failed to load roles', variant: 'destructive' }))
        .finally(() => setLoadingRoles(false));
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      if (teamMember) {
        const startDate = teamMember.teamMemberStartDate
          ? new Date(teamMember.teamMemberStartDate).toISOString().split('T')[0]
          : '';
        reset({
          teamMemberNames: teamMember.teamMemberNames,
          teamMemberSurnames: teamMember.teamMemberSurnames,
          teamMemberKnownAs: teamMember.teamMemberKnownAs || '',
          teamMemberSeniority: teamMember.teamMemberSeniority,
          teamMemberStartDate: startDate,
          countryId: teamMember.countryId?.toString() || '',
          teamMemberPrimaryRole: teamMember.teamMemberPrimaryRole?.toString() || '',
        });
      } else {
        reset({
          teamMemberNames: '',
          teamMemberSurnames: '',
          teamMemberKnownAs: '',
          teamMemberSeniority: '',
          teamMemberStartDate: '',
          countryId: '',
          teamMemberPrimaryRole: '',
        });
      }
    }
  }, [open, teamMember, reset]);

  const onSubmit = async (data: TeamMemberFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateTeamMemberDTO = {
          teamMemberNames: data.teamMemberNames.trim(),
          teamMemberSurnames: data.teamMemberSurnames.trim(),
          teamMemberKnownAs: data.teamMemberKnownAs.trim() || null,
          teamMemberSeniority: data.teamMemberSeniority.trim(),
          teamMemberStartDate: data.teamMemberStartDate,
          countryId: data.countryId ? Number(data.countryId) : null,
          teamMemberPrimaryRole: data.teamMemberPrimaryRole ? Number(data.teamMemberPrimaryRole) : null,
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
          teamMemberSeniority: data.teamMemberSeniority.trim(),
          teamMemberStartDate: data.teamMemberStartDate,
          countryId: data.countryId ? Number(data.countryId) : null,
          teamMemberPrimaryRole: data.teamMemberPrimaryRole ? Number(data.teamMemberPrimaryRole) : null,
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

  return (
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamMemberSeniority">
                  Seniority <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="teamMemberSeniority"
                  placeholder="e.g., Senior, Junior, Lead"
                  {...register('teamMemberSeniority', {
                    required: 'Seniority is required',
                  })}
                />
                {errors.teamMemberSeniority && (
                  <p className="text-sm text-destructive">{errors.teamMemberSeniority.message}</p>
                )}
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
            </div>

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

            {isEditing && teamMember.workdayId && (
              <div className="space-y-2">
                <Label>Workday ID (Read-only)</Label>
                <Input value={teamMember.workdayId} disabled />
                <p className="text-sm text-muted-foreground">
                  Synced from external system
                </p>
              </div>
            )}
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

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { Briefcase, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiPut } from '@/lib/api';
import type { TeamMemberDTO, UpdateTeamMemberDTO, PositionDTO, TierBandDTO } from '@shared/dto';
import type { ShiftDTO } from '@/services/shift';

interface FormValues {
  teamMemberPrimaryRole: string;
  tierBandId: string;
  shiftId: string;
}

interface Props {
  teamMember: TeamMemberDTO;
  roles: PositionDTO[];
  tierBands: TierBandDTO[];
  shifts: ShiftDTO[];
  onSaved: () => void;
}

export function WorkInfoSection({ teamMember, roles, tierBands, shifts, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>();

  register('tierBandId', { required: 'Tier band is required' });

  const watchedPrimaryRole = watch('teamMemberPrimaryRole');
  const watchedTierBandId = watch('tierBandId');
  const watchedShiftId = watch('shiftId');

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
    if (!editing) {
      reset({
        teamMemberPrimaryRole: teamMember.teamMemberPrimaryRole?.toString() ?? '',
        tierBandId: teamMember.tierBandId?.toString() ?? '',
        shiftId: teamMember.shiftId?.toString() ?? '',
      });
    }
  }, [teamMember, editing, reset]);

  function handleCancel() {
    reset();
    setEditing(false);
  }

  async function onSubmit(values: FormValues) {
    try {
      await apiPut<TeamMemberDTO, UpdateTeamMemberDTO>(
        `/api/team-members/${teamMember.teamMemberId}`,
        {
          teamMemberPrimaryRole: values.teamMemberPrimaryRole ? Number(values.teamMemberPrimaryRole) : null,
          tierBandId: Number(values.tierBandId),
          shiftId: values.shiftId ? Number(values.shiftId) : null,
        },
      );
      toast({ title: 'Success', description: 'Work information updated' });
      setEditing(false);
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  }

  const shiftLabel = shifts.find((s) => s.shiftId === teamMember.shiftId)?.description ?? '-';

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Work Information
          </CardTitle>
          {!editing && (
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label>Primary Role</Label>
              <ComboBox
                options={roleOptions}
                value={watchedPrimaryRole}
                onValueChange={(value) => setValue('teamMemberPrimaryRole', value)}
                placeholder="Select a role..."
                searchPlaceholder="Search roles..."
                emptyMessage="No roles found."
              />
            </div>
            <div className="space-y-1">
              <Label>Tier Band <span className="text-destructive">*</span></Label>
              <ComboBox
                options={tierBandOptions}
                value={watchedTierBandId}
                onValueChange={(value) => setValue('tierBandId', value, { shouldValidate: true })}
                placeholder="Select a tier band..."
                searchPlaceholder="Search tier bands..."
                emptyMessage="No tier bands found."
              />
              {errors.tierBandId && (
                <p className="text-sm text-destructive">{errors.tierBandId.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Shift</Label>
              <ComboBox
                options={shiftOptions}
                value={watchedShiftId}
                onValueChange={(value) => setValue('shiftId', value)}
                placeholder="Select a shift..."
                searchPlaceholder="Search shifts..."
                emptyMessage="No shifts found."
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Seniority</dt>
              <dd className="text-sm mt-1">{teamMember.teamMemberSeniority || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Primary Role</dt>
              <dd className="text-sm mt-1">{teamMember.roleName ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Shift</dt>
              <dd className="text-sm mt-1">{shiftLabel}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

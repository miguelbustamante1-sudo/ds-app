import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type {
  MyTeamMemberForManagementDTO,
  UpdateMyTeamMemberDTO,
  CreateTeamMemberChangeRequestDTO,
  PositionDTO,
  TierBandDTO,
  FunctionalAreaDTO,
  ClientContactDTO,
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
import { Badge } from '@/components/ui/badge';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { getShifts, type ShiftDTO } from '@/services/shift';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';

interface EditMemberFormData {
  teamMemberKnownAs: string;
  shiftId: string;
  functionalAreaId: string;
  clientContactId: string;
  tierBandId: string;
  teamMemberPrimaryRole: string;
  teamMemberFullLegalName: string;
}

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MyTeamMemberForManagementDTO;
  onSuccess: () => void;
}

export function EditMemberDialog({ open, onOpenChange, member, onSuccess }: EditMemberDialogProps) {
  const { toast } = useToast();

  const [shifts, setShifts] = useState<ShiftDTO[]>([]);
  const [functionalAreas, setFunctionalAreas] = useState<FunctionalAreaDTO[]>([]);
  const [contacts, setContacts] = useState<ClientContactDTO[]>([]);
  const [roles, setRoles] = useState<PositionDTO[]>([]);
  const [tierBands, setTierBands] = useState<TierBandDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<EditMemberFormData>({
    defaultValues: {
      teamMemberKnownAs: '',
      shiftId: '',
      functionalAreaId: '',
      clientContactId: '',
      tierBandId: '',
      teamMemberPrimaryRole: '',
      teamMemberFullLegalName: '',
    },
  });

  const watchedShiftId = watch('shiftId');
  const watchedFunctionalAreaId = watch('functionalAreaId');
  const watchedClientContactId = watch('clientContactId');
  const watchedTierBandId = watch('tierBandId');
  const watchedPrimaryRole = watch('teamMemberPrimaryRole');

  useEffect(() => {
    if (!open) return;
    reset({
      teamMemberKnownAs: member.teamMemberKnownAs ?? '',
      shiftId: member.shiftId != null ? String(member.shiftId) : '',
      functionalAreaId: member.activeAssignment?.functionalAreaId != null
        ? String(member.activeAssignment.functionalAreaId)
        : '',
      clientContactId: member.activeAssignment?.clientContactId != null
        ? String(member.activeAssignment.clientContactId)
        : '',
      tierBandId: member.tierBandId != null ? String(member.tierBandId) : '',
      teamMemberPrimaryRole: member.teamMemberPrimaryRole != null ? String(member.teamMemberPrimaryRole) : '',
      teamMemberFullLegalName: member.teamMemberFullLegalName ?? '',
    });
  }, [open, member, reset]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      getShifts(),
      apiGet<FunctionalAreaDTO[]>('/api/functional-areas'),
      apiGet<PositionDTO[]>('/api/positions'),
      apiGet<TierBandDTO[]>('/api/tier-bands'),
      member.activeAssignment?.clientId
        ? apiGet<ClientContactDTO[]>(`/api/client-contacts?clientId=${member.activeAssignment.clientId}`)
        : Promise.resolve([]),
    ])
      .then(([shiftData, faData, roleData, tierData, contactData]) => {
        setShifts(shiftData);
        setFunctionalAreas(faData);
        setRoles(roleData);
        setTierBands(tierData);
        setContacts(contactData.filter((c) => c.active));
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load form options', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [open, member.activeAssignment?.clientId, toast]);

  const shiftOptions: ComboBoxOption[] = shifts.map((s) => ({ value: s.shiftId.toString(), label: s.description }));
  const functionalAreaOptions: ComboBoxOption[] = functionalAreas.map((fa) => ({
    value: fa.Id.toString(),
    label: fa.Name,
  }));
  const contactOptions: ComboBoxOption[] = contacts.map((c) => ({ value: c.id.toString(), label: c.name }));
  const roleOptions: ComboBoxOption[] = roles.map((r) => ({ value: r.posId.toString(), label: r.posName }));
  const tierBandOptions: ComboBoxOption[] = tierBands.map((t) => ({
    value: t.tierBandId.toString(),
    label: t.tierBandDescription,
  }));

  const onSubmit = async (data: EditMemberFormData) => {
    try {
      const freeEdit: UpdateMyTeamMemberDTO = {};
      if (data.teamMemberKnownAs !== (member.teamMemberKnownAs ?? '')) {
        freeEdit.teamMemberKnownAs = data.teamMemberKnownAs.trim() || null;
      }
      if (data.shiftId !== (member.shiftId != null ? String(member.shiftId) : '')) {
        freeEdit.shiftId = data.shiftId ? Number(data.shiftId) : null;
      }
      if (member.activeAssignment) {
        const currentFa = member.activeAssignment.functionalAreaId != null
          ? String(member.activeAssignment.functionalAreaId)
          : '';
        if (data.functionalAreaId !== currentFa) {
          freeEdit.functionalAreaId = data.functionalAreaId ? Number(data.functionalAreaId) : null;
        }
        const currentContact = member.activeAssignment.clientContactId != null
          ? String(member.activeAssignment.clientContactId)
          : '';
        if (data.clientContactId !== currentContact) {
          freeEdit.clientContactId = data.clientContactId ? Number(data.clientContactId) : null;
        }
      }

      const changeRequest: CreateTeamMemberChangeRequestDTO = {};
      let hasChangeRequest = false;
      const currentTierBandId = member.tierBandId != null ? String(member.tierBandId) : '';
      if (data.tierBandId !== currentTierBandId && data.tierBandId) {
        changeRequest.tierBandId = Number(data.tierBandId);
        hasChangeRequest = true;
      }
      const currentRole = member.teamMemberPrimaryRole != null ? String(member.teamMemberPrimaryRole) : '';
      if (data.teamMemberPrimaryRole !== currentRole) {
        changeRequest.teamMemberPrimaryRole = data.teamMemberPrimaryRole ? Number(data.teamMemberPrimaryRole) : null;
        hasChangeRequest = true;
      }
      if (data.teamMemberFullLegalName !== (member.teamMemberFullLegalName ?? '')) {
        changeRequest.teamMemberFullLegalName = data.teamMemberFullLegalName.trim() || null;
        hasChangeRequest = true;
      }

      const calls: Promise<unknown>[] = [];
      if (Object.keys(freeEdit).length > 0) {
        calls.push(apiPatch(`/api/team-management/members/${member.teamMemberId}`, freeEdit));
      }
      if (hasChangeRequest) {
        calls.push(
          apiPost(`/api/team-management/members/${member.teamMemberId}/change-requests`, changeRequest),
        );
      }

      if (calls.length === 0) {
        onOpenChange(false);
        return;
      }

      await Promise.all(calls);

      toast({
        title: 'Success',
        description: hasChangeRequest
          ? 'Changes saved. Sensitive field changes were submitted for OM approval.'
          : 'Team member updated successfully.',
      });
      onSuccess();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update team member';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {member.teamMemberNames} {member.teamMemberSurnames}
          </DialogTitle>
          <DialogDescription>
            Known-as, shift, functional area, and client contact save immediately. Tier/Band, primary role, and
            legal name require OM approval before taking effect.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {/* Non-editable fields (FR-011) */}
            <div className="grid grid-cols-3 gap-4 rounded-lg border bg-muted/40 p-4 text-sm">
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatUTCDate(member.teamMemberStartDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Country</p>
                <p className="font-medium">{member.countryName ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Workday ID</p>
                <p className="font-medium">{member.workdayId ?? '—'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamMemberKnownAs">Known As</Label>
              <Input id="teamMemberKnownAs" {...register('teamMemberKnownAs')} />
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
                disabled={loading}
              />
            </div>

            {member.activeAssignment ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Functional Area</Label>
                  <ComboBox
                    options={functionalAreaOptions}
                    value={watchedFunctionalAreaId}
                    onValueChange={(value) => setValue('functionalAreaId', value)}
                    placeholder="Select functional area..."
                    searchPlaceholder="Search..."
                    emptyMessage="No functional areas found."
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Contact</Label>
                  <ComboBox
                    options={contactOptions}
                    value={watchedClientContactId}
                    onValueChange={(value) => setValue('clientContactId', value)}
                    placeholder="Select a contact..."
                    searchPlaceholder="Search contacts..."
                    emptyMessage="No contacts found."
                    disabled={loading}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active project assignment — functional area and client contact are not applicable.
              </p>
            )}

            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="warning">Requires OM approval</Badge>
              </div>

              <div className="space-y-2">
                <Label>Tier / Band</Label>
                <ComboBox
                  options={tierBandOptions}
                  value={watchedTierBandId}
                  onValueChange={(value) => setValue('tierBandId', value)}
                  placeholder="Select a tier band..."
                  searchPlaceholder="Search tier bands..."
                  emptyMessage="No tier bands found."
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Primary Role</Label>
                <ComboBox
                  options={roleOptions}
                  value={watchedPrimaryRole}
                  onValueChange={(value) => setValue('teamMemberPrimaryRole', value)}
                  placeholder="Select a role..."
                  searchPlaceholder="Search roles..."
                  emptyMessage="No roles found."
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamMemberFullLegalName">Full Legal Name</Label>
                <Input id="teamMemberFullLegalName" {...register('teamMemberFullLegalName')} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api';
import { createPerformanceCase, lookupManagerForTeamMember } from '@/api/performanceCases';
import type { CreatePerformanceCaseDTO, PerformanceSeverityTier, TeamMemberDTO } from '@shared/dto';

const SEVERITY_OPTIONS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

interface CreateCaseFormValues {
  teamMemberId: number | null;
  teamLeaderId: number | null;
  severityTier: PerformanceSeverityTier;
  managerName: string;
  managerEmail: string;
  caseLabel: string;
}

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (caseId: number) => void;
}

export function CreateCaseDialog({ open, onOpenChange, onCreated }: CreateCaseDialogProps) {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const { control, handleSubmit, reset, watch, setValue } = useForm<CreateCaseFormValues>({
    defaultValues: {
      teamMemberId: null,
      teamLeaderId: null,
      severityTier: 'STANDARD',
      managerName: '',
      managerEmail: '',
      caseLabel: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    void apiGet<TeamMemberDTO[]>('/api/team-members/active').then(setTeamMembers).catch(() => {});
  }, [open]);

  const watchedTeamMemberId = watch('teamMemberId');

  useEffect(() => {
    if (!watchedTeamMemberId) return;
    let cancelled = false;
    lookupManagerForTeamMember(watchedTeamMemberId)
      .then((manager) => {
        if (cancelled) return;
        if (manager.managerName) setValue('managerName', manager.managerName, { shouldDirty: true });
        if (manager.managerEmail) setValue('managerEmail', manager.managerEmail, { shouldDirty: true });
      })
      .catch(() => {
        // No pre-fill available — the user types the manager manually.
      });
    return () => {
      cancelled = true;
    };
  }, [watchedTeamMemberId, setValue]);

  const memberOptions = teamMembers.map((m) => ({
    value: String(m.teamMemberId),
    label: m.workdayId
      ? `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`
      : `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));

  async function onSubmit(values: CreateCaseFormValues) {
    if (!values.teamMemberId || !values.teamLeaderId) {
      toast({ title: 'Team member and team leader are required', variant: 'destructive' });
      return;
    }
    try {
      const input: CreatePerformanceCaseDTO = {
        teamMemberId: values.teamMemberId,
        teamLeaderId: values.teamLeaderId,
        severityTier: values.severityTier,
        managerName: values.managerName,
        managerEmail: values.managerEmail,
        caseLabel: values.caseLabel || undefined,
      };
      const created = await createPerformanceCase(input);
      toast({ title: `Case ${created.caseCode} created` });
      reset();
      onOpenChange(false);
      onCreated(created.caseId);
    } catch (err) {
      toast({ title: 'Failed to create case', description: String(err), variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Performance Case</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Team Member</Label>
            <Controller
              name="teamMemberId"
              control={control}
              render={({ field }) => (
                <ComboBox
                  options={memberOptions}
                  value={field.value !== null ? String(field.value) : ''}
                  onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                  placeholder="Search team member..."
                />
              )}
            />
          </div>
          <div>
            <Label>Team Leader</Label>
            <Controller
              name="teamLeaderId"
              control={control}
              render={({ field }) => (
                <ComboBox
                  options={memberOptions}
                  value={field.value !== null ? String(field.value) : ''}
                  onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                  placeholder="Search team leader..."
                />
              )}
            />
          </div>
          <div>
            <Label>Severity Tier</Label>
            <Controller
              name="severityTier"
              control={control}
              render={({ field }) => (
                <ComboBox
                  options={SEVERITY_OPTIONS}
                  value={field.value}
                  onValueChange={(val) => field.onChange(val as PerformanceSeverityTier)}
                />
              )}
            />
          </div>
          <div>
            <Label>Manager Name</Label>
            <Controller name="managerName" control={control} render={({ field }) => <Input {...field} />} />
          </div>
          <div>
            <Label>Manager Email</Label>
            <Controller
              name="managerEmail"
              control={control}
              render={({ field }) => <Input type="email" {...field} />}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pre-filled from the team member&apos;s L1 manager when available — edit if incorrect.
            </p>
          </div>
          <div>
            <Label>Reason (optional)</Label>
            <Controller
              name="caseLabel"
              control={control}
              render={({ field }) => <Input placeholder="e.g. Low CSAT Score" {...field} />}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Create Case</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

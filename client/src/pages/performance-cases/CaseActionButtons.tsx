import type { ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/auth/auth-provider';
import { formatUTCDate } from '@/lib/utils';
import { recordSignoff, recordClosureCriteria, updatePlanEndDate } from '@/api/performanceCases';
import type { PerformanceCaseDTO, PerformanceCaseDisplayDTO, UpdatePlanEndDateDTO } from '@shared/dto';

interface ClosureCriteriaFormValues {
  clientConfirmedImprovement: boolean;
  metricImprovedVsBaseline: boolean;
  noNewEscalationLast2Weeks: boolean;
}

interface PlanEndDateFormValues {
  open: boolean;
  newEndDate: string;
  changeComment: string;
  hintForSuccessTriggered: boolean;
}

interface CaseActionButtonsProps {
  perfCase: PerformanceCaseDisplayDTO;
  onUpdated: (updated: PerformanceCaseDTO) => void;
}

const CLOSURE_CRITERIA: { name: keyof ClosureCriteriaFormValues; label: string }[] = [
  { name: 'clientConfirmedImprovement', label: 'Client/manager confirmed improvement' },
  { name: 'metricImprovedVsBaseline', label: 'Metric improved vs. baseline' },
  { name: 'noNewEscalationLast2Weeks', label: 'No new escalation in final 2 weeks' },
];

export function CaseActionButtons({ perfCase, onUpdated }: CaseActionButtonsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('admin') ?? false;
  const isOm = user?.teamMemberId != null && user.teamMemberId === perfCase.omId;

  const criteriaForm = useForm<ClosureCriteriaFormValues>({
    defaultValues: {
      clientConfirmedImprovement: perfCase.clientConfirmedImprovement ?? false,
      metricImprovedVsBaseline: perfCase.metricImprovedVsBaseline ?? false,
      noNewEscalationLast2Weeks: perfCase.noNewEscalationLast2Weeks ?? false,
    },
  });

  const planForm = useForm<PlanEndDateFormValues>({
    defaultValues: { open: false, newEndDate: '', changeComment: '', hintForSuccessTriggered: false },
  });
  const planOpen = planForm.watch('open');
  const planEndDate = planForm.watch('newEndDate');
  const planComment = planForm.watch('changeComment');

  async function handleRcaSignoff() {
    try {
      const updated = await recordSignoff(perfCase.caseId, 'rca');
      toast({ title: 'RCA signed off', description: 'The Team Leader has been notified.' });
      onUpdated(updated);
    } catch (err) {
      toast({ title: 'Failed to sign off', description: String(err), variant: 'destructive' });
    }
  }

  async function handleClosureCriteria(values: ClosureCriteriaFormValues) {
    try {
      const updated = await recordClosureCriteria(perfCase.caseId, { ...values });
      toast({ title: 'Closure criteria recorded' });
      onUpdated(updated);
    } catch (err) {
      toast({ title: 'Failed to record criteria', description: String(err), variant: 'destructive' });
    }
  }

  async function handleClosureSignoff() {
    try {
      const updated = await recordSignoff(perfCase.caseId, 'closure');
      toast({ title: 'Case closed' });
      onUpdated(updated);
    } catch (err) {
      toast({ title: 'Failed to close case', description: String(err), variant: 'destructive' });
    }
  }

  async function handleUpdatePlanEndDate(values: PlanEndDateFormValues) {
    try {
      const payload: UpdatePlanEndDateDTO = {
        newEndDate: values.newEndDate,
        changeComment: values.changeComment.trim(),
        hintForSuccessTriggered: values.hintForSuccessTriggered,
      };
      await updatePlanEndDate(perfCase.caseId, payload);
      toast({ title: 'Plan end date updated' });
      planForm.reset();
    } catch (err) {
      toast({ title: 'Failed to update plan end date', description: String(err), variant: 'destructive' });
    }
  }

  let phaseContent: ReactNode = null;

  if (perfCase.currentPhase === 'PHASE_2') {
    if (perfCase.rcaSignoffDate) {
      phaseContent = (
        <p className="text-sm">
          OM RCA sign-off recorded by <span className="font-medium">{perfCase.rcaSignoffByName ?? 'unknown user'}</span> on{' '}
          {formatUTCDate(perfCase.rcaSignoffDate)}. You can now complete Phase 2 and advance.
        </p>
      );
    } else if (isOm || isAdmin) {
      phaseContent = (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Recording the sign-off confirms the Operations Manager reviewed the RCA. It unblocks
            &quot;Complete Phase &amp; Advance&quot; to Plan + Commitment and notifies the Team Leader.
          </p>
          <Button onClick={handleRcaSignoff}>Record OM RCA Sign-off</Button>
        </div>
      );
    } else {
      phaseContent = (
        <p className="text-sm text-muted-foreground">
          Waiting for the Operations Manager&apos;s RCA sign-off. The OM was notified when the RCA document was saved;
          Phase 2 cannot be completed until it is recorded.
        </p>
      );
    }
  }

  if (perfCase.currentPhase === 'PHASE_6') {
    phaseContent = (
      <form className="space-y-3" onSubmit={criteriaForm.handleSubmit(handleClosureCriteria)}>
        {CLOSURE_CRITERIA.map(({ name, label }) => (
          <div key={name} className="flex items-center gap-2">
            <Controller
              name={name}
              control={criteriaForm.control}
              render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />}
            />
            <Label>{label}</Label>
          </div>
        ))}
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            Save Criteria
          </Button>
          <Button type="button" onClick={handleClosureSignoff}>
            Record Closure Sign-off
          </Button>
        </div>
      </form>
    );
  }

  const showPlanEndDateControl = perfCase.currentPhase === 'PHASE_5' || perfCase.currentPhase === 'PHASE_6';

  if (!phaseContent && !showPlanEndDateControl) return null;

  return (
    <div className="space-y-4">
      {phaseContent}
      {showPlanEndDateControl && (
        <div className="mt-4 space-y-2">
          {planOpen ? (
            <form className="space-y-2" onSubmit={planForm.handleSubmit(handleUpdatePlanEndDate)}>
              <Input type="date" className="w-[200px]" {...planForm.register('newEndDate', { required: true })} />
              <Textarea placeholder="Reason for change" {...planForm.register('changeComment', { required: true })} />
              <div className="flex items-center gap-2">
                <Controller
                  name="hintForSuccessTriggered"
                  control={planForm.control}
                  render={({ field }) => (
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                  )}
                />
                <Label>Hint for success triggered</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => planForm.reset()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!planEndDate || !planComment.trim()}>
                  Save New End Date
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" variant="outline" onClick={() => planForm.setValue('open', true)}>
              Change Plan End Date
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { recordSignoff, recordClosureCriteria, updatePlanEndDate } from '@/api/performanceCases';
import type { PerformanceCaseDTO } from '@shared/dto';

export function CaseActionButtons({
  perfCase,
  onUpdated,
}: {
  perfCase: PerformanceCaseDTO;
  onUpdated: (updated: PerformanceCaseDTO) => void;
}) {
  const { toast } = useToast();
  const [criteria, setCriteria] = useState({
    clientConfirmedImprovement: false,
    metricImprovedVsBaseline: false,
    noNewEscalationLast2Weeks: false,
  });
  const [planEndDateOpen, setPlanEndDateOpen] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [changeComment, setChangeComment] = useState('');
  const [hintTriggered, setHintTriggered] = useState(false);

  async function handleRcaSignoff() {
    try {
      const updated = await recordSignoff(perfCase.caseId, 'rca');
      toast({ title: 'RCA signed off' });
      onUpdated(updated);
    } catch (err) {
      toast({ title: 'Failed to sign off', description: String(err), variant: 'destructive' });
    }
  }

  async function handleClosureCriteria() {
    try {
      const updated = await recordClosureCriteria(perfCase.caseId, criteria);
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

  async function handleUpdatePlanEndDate() {
    try {
      await updatePlanEndDate(perfCase.caseId, {
        newEndDate,
        changeComment,
        hintForSuccessTriggered: hintTriggered,
      });
      toast({ title: 'Plan end date updated' });
      setPlanEndDateOpen(false);
    } catch (err) {
      toast({ title: 'Failed to update plan end date', description: String(err), variant: 'destructive' });
    }
  }

  let phaseContent: React.ReactNode = null;

  if (perfCase.currentPhase === 'PHASE_2') {
    phaseContent = <Button onClick={handleRcaSignoff}>Record OM RCA Sign-off</Button>;
  }

  if (perfCase.currentPhase === 'PHASE_6') {
    phaseContent = (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={criteria.clientConfirmedImprovement}
            onCheckedChange={(v) => setCriteria((c) => ({ ...c, clientConfirmedImprovement: Boolean(v) }))}
          />
          <Label>Client/manager confirmed improvement</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={criteria.metricImprovedVsBaseline}
            onCheckedChange={(v) => setCriteria((c) => ({ ...c, metricImprovedVsBaseline: Boolean(v) }))}
          />
          <Label>Metric improved vs. baseline</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={criteria.noNewEscalationLast2Weeks}
            onCheckedChange={(v) => setCriteria((c) => ({ ...c, noNewEscalationLast2Weeks: Boolean(v) }))}
          />
          <Label>No new escalation in final 2 weeks</Label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClosureCriteria}>
            Save Criteria
          </Button>
          <Button onClick={handleClosureSignoff}>Record Closure Sign-off</Button>
        </div>
      </div>
    );
  }

  const showPlanEndDateControl = perfCase.currentPhase === 'PHASE_5' || perfCase.currentPhase === 'PHASE_6';

  if (!phaseContent && !showPlanEndDateControl) return null;

  return (
    <div className="space-y-4">
      {phaseContent}
      {showPlanEndDateControl && (
        <div className="mt-4 space-y-2">
          {planEndDateOpen ? (
            <div className="space-y-2">
              <Input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
              <Textarea
                placeholder="Reason for change"
                value={changeComment}
                onChange={(e) => setChangeComment(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Checkbox checked={hintTriggered} onCheckedChange={(v) => setHintTriggered(Boolean(v))} />
                <Label>Hint for success triggered</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPlanEndDateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdatePlanEndDate} disabled={!newEndDate || !changeComment.trim()}>
                  Save New End Date
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setPlanEndDateOpen(true)}>
              Change Plan End Date
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

import { useForm, Controller } from 'react-hook-form';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { resultsApi } from '@/api/topPerformers/results';
import type { LeaderboardEntry } from '@/api/topPerformers/results';

interface DecisionFormData {
  winnerId: number;
  justification: string;
}

interface CommitteeDecisionPanelProps {
  cycId: number;
  leaderboard: LeaderboardEntry[];
  onClose: () => void;
}

export function CommitteeDecisionPanel({ cycId, leaderboard, onClose }: CommitteeDecisionPanelProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<DecisionFormData>();
  const justification = watch('justification', '');

  const top5 = leaderboard.slice(0, 5);
  const winnerOptions = top5.map((e) => ({
    value: String(e.nomineeId),
    label: `${e.nomineeNames} ${e.nomineeSurnames} (${e.totalWeightedPoints} pts)`,
  }));

  async function onSaveDecision(data: DecisionFormData) {
    setSaving(true);
    try {
      await resultsApi.saveDecision(cycId, data.winnerId, data.justification);
      setStep('confirm');
    } catch {
      toast({ title: 'Error saving decision', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function onConfirm() {
    setSaving(true);
    try {
      await resultsApi.confirmDecision(cycId);
      toast({ title: 'Confirmation recorded' });
      setStep('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error confirming';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Evaluator Committee Decision</DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <form onSubmit={handleSubmit(onSaveDecision)} className="space-y-4">
            <div>
              <Label>Selected winner (from Top 5)</Label>
              <Controller
                name="winnerId"
                control={control}
                rules={{ required: 'Select a winner' }}
                render={({ field }) => (
                  <ComboBox
                    options={winnerOptions}
                    value={field.value ? String(field.value) : ''}
                    onChange={(v) => field.onChange(parseInt(v, 10))}
                    placeholder="Select the winner..."
                  />
                )}
              />
              {errors.winnerId && <p className="text-destructive text-sm">{errors.winnerId.message}</p>}
            </div>

            <div>
              <Label>Decision justification (min. 100 characters)</Label>
              <p className="text-xs text-muted-foreground mb-1">
                This justification will be published with the winner announcement.
              </p>
              <Textarea
                {...register('justification', {
                  required: 'Required',
                  minLength: { value: 100, message: 'Minimum 100 characters' },
                })}
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">{justification.length} characters</p>
              {errors.justification && <p className="text-destructive text-sm">{errors.justification.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save and continue'}</Button>
            </DialogFooter>
          </form>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm">
              Decision saved. <strong>2 confirmations</strong> from different Committee members are required to finalize.
            </p>
            <p className="text-sm font-semibold text-amber-700">
              ⚠ This action is irreversible. Once two members confirm, results are frozen.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={onConfirm} disabled={saving} variant="destructive">
                {saving ? 'Confirming...' : 'Confirm my decision vote'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-3 text-center">
            <p className="text-green-600 font-bold text-lg">Confirmation recorded</p>
            <p className="text-sm text-muted-foreground">
              If a second Committee member has already confirmed, results are frozen and the cycle is closed.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
      toast({ title: 'Error al guardar la decisión', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function onConfirm() {
    setSaving(true);
    try {
      await resultsApi.confirmDecision(cycId);
      toast({ title: 'Confirmación registrada' });
      setStep('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al confirmar';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Decisión del Comité Evaluador</DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <form onSubmit={handleSubmit(onSaveDecision)} className="space-y-4">
            <div>
              <Label>Ganador seleccionado (entre el Top 5)</Label>
              <Controller
                name="winnerId"
                control={control}
                rules={{ required: 'Selecciona un ganador' }}
                render={({ field }) => (
                  <ComboBox
                    options={winnerOptions}
                    value={field.value ? String(field.value) : ''}
                    onChange={(v) => field.onChange(parseInt(v, 10))}
                    placeholder="Selecciona al ganador..."
                  />
                )}
              />
              {errors.winnerId && <p className="text-destructive text-sm">{errors.winnerId.message}</p>}
            </div>

            <div>
              <Label>Justificación de la decisión (mín. 100 caracteres)</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Esta justificación se publicará junto con el anuncio del ganador.
              </p>
              <Textarea
                {...register('justification', {
                  required: 'Requerido',
                  minLength: { value: 100, message: 'Mínimo 100 caracteres' },
                })}
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">{justification.length} caracteres</p>
              {errors.justification && <p className="text-destructive text-sm">{errors.justification.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar y continuar'}</Button>
            </DialogFooter>
          </form>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm">
              La decisión ha sido guardada. Se requieren <strong>2 confirmaciones</strong> de miembros distintos del Comité para finalizar.
            </p>
            <p className="text-sm font-semibold text-amber-700">
              ⚠ Esta acción es irreversible. Una vez que dos miembros confirmen, los resultados quedan congelados.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cerrar</Button>
              <Button onClick={onConfirm} disabled={saving} variant="destructive">
                {saving ? 'Confirmando...' : 'Confirmar mi voto de decisión'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-3 text-center">
            <p className="text-green-600 font-bold text-lg">Confirmación registrada</p>
            <p className="text-sm text-muted-foreground">
              Si un segundo miembro del Comité ya confirmó, los resultados han sido congelados y el ciclo está cerrado.
            </p>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

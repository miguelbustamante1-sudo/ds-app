import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { savePhaseFields, saveCompletedPhaseFields, advancePhase } from '@/api/performanceCases';
import { PHASE_FIELD_SPECS } from './phaseFieldKeys';
import type { PhaseFieldSpec } from './phaseFieldKeys';
import { PHASE_LABELS } from './PhaseStepper';
import type { PerformanceCaseDTO, PerformanceCasePhaseDTO, PerformanceCasePhaseName } from '@shared/dto';

interface PhaseFieldsFormProps {
  perfCase: PerformanceCaseDTO;
  phase: PerformanceCasePhaseName;
  phaseRow: PerformanceCasePhaseDTO | undefined;
  onSaved: (saved: PerformanceCasePhaseDTO) => void;
  onAdvanced: (updated: PerformanceCaseDTO) => void;
}

function valuesFromRow(specs: PhaseFieldSpec[], row: PerformanceCasePhaseDTO | undefined): Record<string, string> {
  return Object.fromEntries(
    specs.map((s) => {
      const stored = row?.fields[s.key];
      return [s.key, typeof stored === 'string' ? stored : ''];
    }),
  );
}

export function PhaseFieldsForm({ perfCase, phase, phaseRow, onSaved, onAdvanced }: PhaseFieldsFormProps) {
  const { toast } = useToast();
  const specs = PHASE_FIELD_SPECS[phase];
  const isCurrentPhase = phase === perfCase.currentPhase;
  const isEditable = perfCase.caseStatus === 'ACTIVE';
  const { control, handleSubmit, getValues, reset } = useForm<Record<string, string>>({
    defaultValues: valuesFromRow(specs, phaseRow),
  });

  useEffect(() => {
    reset(valuesFromRow(specs, phaseRow));
  }, [phase, phaseRow, specs, reset]);

  async function onSave() {
    try {
      const saved = isCurrentPhase
        ? await savePhaseFields(perfCase.caseId, getValues())
        : await saveCompletedPhaseFields(perfCase.caseId, phase, getValues());
      onSaved(saved);
      toast({ title: isCurrentPhase ? 'Progress saved' : `${PHASE_LABELS[phase]} updated` });
    } catch (err) {
      toast({ title: 'Failed to save', description: String(err), variant: 'destructive' });
    }
  }

  async function onAdvance() {
    try {
      const updated = await advancePhase(perfCase.caseId, { fields: getValues() });
      toast({ title: `Advanced to ${PHASE_LABELS[updated.currentPhase]}` });
      onAdvanced(updated);
    } catch (err) {
      toast({ title: 'Cannot advance', description: String(err), variant: 'destructive' });
    }
  }

  if (specs.length === 0) {
    // POST_CLOSURE (and any future phase with no required fields) has nothing to fill in or advance past here.
    return null;
  }

  return (
    <form className="space-y-4">
      {!isCurrentPhase && (
        <p className="text-sm text-muted-foreground">
          Reviewing completed phase <span className="font-medium">{PHASE_LABELS[phase]}</span>
          {!isEditable && ' — this case is closed, so the phase is read-only.'}
        </p>
      )}
      {specs.map((spec) => (
        <div key={spec.key}>
          <Label>{spec.label}</Label>
          <Controller
            name={spec.key}
            control={control}
            render={({ field }) => {
              if (spec.type === 'combobox') {
                return (
                  <ComboBox
                    options={spec.options ?? []}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!isEditable}
                  />
                );
              }
              if (spec.type === 'date') {
                return <Input type="date" className="w-[200px]" disabled={!isEditable} {...field} />;
              }
              return <Textarea rows={8} disabled={!isEditable} {...field} />;
            }}
          />
        </div>
      ))}
      {isEditable && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleSubmit(onSave)}>
            {isCurrentPhase ? 'Save Progress' : 'Save Changes'}
          </Button>
          {isCurrentPhase && (
            <Button type="button" onClick={handleSubmit(onAdvance)}>
              Complete Phase & Advance
            </Button>
          )}
        </div>
      )}
    </form>
  );
}

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { savePhaseFields, advancePhase } from '@/api/performanceCases';
import { PHASE_FIELD_SPECS } from './phaseFieldKeys';
import type { PhaseFieldSpec } from './phaseFieldKeys';
import type { PerformanceCaseDTO, PerformanceCasePhaseDTO } from '@shared/dto';

interface PhaseFieldsFormProps {
  perfCase: PerformanceCaseDTO;
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

export function PhaseFieldsForm({ perfCase, phaseRow, onSaved, onAdvanced }: PhaseFieldsFormProps) {
  const { toast } = useToast();
  const specs = PHASE_FIELD_SPECS[perfCase.currentPhase];
  const { control, handleSubmit, getValues, reset } = useForm<Record<string, string>>({
    defaultValues: valuesFromRow(specs, phaseRow),
  });

  useEffect(() => {
    reset(valuesFromRow(specs, phaseRow));
  }, [phaseRow, specs, reset]);

  async function onSave() {
    try {
      const saved = await savePhaseFields(perfCase.caseId, getValues());
      onSaved(saved);
      toast({ title: 'Progress saved' });
    } catch (err) {
      toast({ title: 'Failed to save', description: String(err), variant: 'destructive' });
    }
  }

  async function onAdvance() {
    try {
      const updated = await advancePhase(perfCase.caseId, { fields: getValues() });
      toast({ title: `Advanced to ${updated.currentPhase}` });
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
      {specs.map((spec) => (
        <div key={spec.key}>
          <Label>{spec.label}</Label>
          <Controller
            name={spec.key}
            control={control}
            render={({ field }) => {
              if (spec.type === 'combobox') {
                return <ComboBox options={spec.options ?? []} value={field.value} onValueChange={field.onChange} />;
              }
              if (spec.type === 'date') {
                return <Input type="date" className="w-[200px]" {...field} />;
              }
              return <Textarea rows={8} {...field} />;
            }}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={handleSubmit(onSave)}>
          Save Progress
        </Button>
        <Button type="button" onClick={handleSubmit(onAdvance)}>
          Complete Phase & Advance
        </Button>
      </div>
    </form>
  );
}

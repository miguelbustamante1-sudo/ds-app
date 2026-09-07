import { useForm, Controller } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { savePhaseFields, advancePhase } from '@/api/performanceCases';
import { PHASE_FIELD_SPECS } from './phaseFieldKeys';
import type { PerformanceCaseDTO } from '@shared/dto';

interface PhaseFieldsFormProps {
  perfCase: PerformanceCaseDTO;
  onAdvanced: (updated: PerformanceCaseDTO) => void;
}

export function PhaseFieldsForm({ perfCase, onAdvanced }: PhaseFieldsFormProps) {
  const { toast } = useToast();
  const specs = PHASE_FIELD_SPECS[perfCase.currentPhase];
  const { control, handleSubmit, getValues } = useForm<Record<string, string>>({
    defaultValues: Object.fromEntries(specs.map((s) => [s.key, ''])),
  });

  async function onSave() {
    try {
      await savePhaseFields(perfCase.caseId, getValues());
      toast({ title: 'Saved' });
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
            render={({ field }) =>
              spec.type === 'combobox' ? (
                <ComboBox options={spec.options ?? []} value={field.value} onValueChange={field.onChange} />
              ) : (
                <Textarea rows={8} {...field} />
              )
            }
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

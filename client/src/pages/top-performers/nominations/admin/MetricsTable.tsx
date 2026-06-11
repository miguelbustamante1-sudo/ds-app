import { useFieldArray } from 'react-hook-form';
import type { Control, UseFormRegister } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminNominationPayload } from '@/api/topPerformers/nominations';

interface MetricsTableProps {
  control: Control<AdminNominationPayload>;
  register: UseFormRegister<AdminNominationPayload>;
}

export function MetricsTable({ control, register }: MetricsTableProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'metrics' });

  return (
    <div className="space-y-2">
      {fields.map((field, i) => (
        <div key={field.id} className="grid grid-cols-3 gap-2 items-center">
          <Input
            {...register(`metrics.${i}.metricName`, { required: true })}
            placeholder="Metric (e.g. CSAT)"
          />
          <Input
            {...register(`metrics.${i}.metricValue`, { required: true })}
            placeholder="Value (e.g. 94%)"
          />
          <div className="flex gap-1">
            <Input
              {...register(`metrics.${i}.metricBenchmark`)}
              placeholder="Goal (e.g. 88%)"
            />
            {fields.length > 1 && (
              <Button type="button" variant="destructive" size="sm" onClick={() => remove(i)}>✕</Button>
            )}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ metricName: '', metricValue: '', metricBenchmark: '' })}
      >
        + Add metric
      </Button>
    </div>
  );
}

import { useForm, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboBox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createCheckIn } from '@/api/performanceCases';
import type { CreateCheckInDTO, PerformanceCheckInStatus } from '@shared/dto';

const STATUS_OPTIONS = [
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'NO_PROGRESS', label: 'No Progress' },
];

export function CheckInForm({ caseId }: { caseId: number }) {
  const { toast } = useToast();
  const { control, handleSubmit, reset } = useForm<CreateCheckInDTO>({
    defaultValues: {
      checkInDate: new Date().toISOString().slice(0, 10),
      tmUpdate: '',
      managerFeedbackReceived: false,
      status: 'ON_TRACK',
    },
  });

  async function onSubmit(values: CreateCheckInDTO) {
    try {
      await createCheckIn(caseId, values);
      toast({ title: 'Check-in logged' });
      reset();
    } catch (err) {
      toast({ title: 'Failed to log check-in', description: String(err), variant: 'destructive' });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>TM Update</Label>
        <Controller name="tmUpdate" control={control} render={({ field }) => <Textarea rows={6} {...field} />} />
      </div>
      <div className="flex items-center gap-2">
        <Controller
          name="managerFeedbackReceived"
          control={control}
          render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
        />
        <Label>Manager feedback received</Label>
      </div>
      <div>
        <Label>Status</Label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <ComboBox
              options={STATUS_OPTIONS}
              value={field.value}
              onValueChange={(val) => field.onChange(val as PerformanceCheckInStatus)}
            />
          )}
        />
      </div>
      <Button type="submit">Log Check-In</Button>
    </form>
  );
}

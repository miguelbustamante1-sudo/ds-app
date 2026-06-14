import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload/FileUpload';
import { MetricsTable } from './MetricsTable';
import { nominationsApi } from '@/api/topPerformers/nominations';
import type { AdminNominationPayload } from '@/api/topPerformers/nominations';
import { cyclesApi } from '@/api/topPerformers/cycles';
import { apiGet } from '@/lib/api';
import { TELUS_VALUES } from '@/constants/telusValues';

interface DirectReport { teamMemberId: number; workdayId: string | null; teamMemberNames: string; teamMemberSurnames: string; }

export default function AdminNominationPage() {
  const { toast } = useToast();
  const { data: activeCycle } = useQuery({ queryKey: ['tp-active-cycle'], queryFn: cyclesApi.getActive });
  const { data: reports = [] } = useQuery<DirectReport[]>({
    queryKey: ['my-reports-for-tp'],
    queryFn: () => apiGet<DirectReport[]>('/api/team-members/my-reports'),
  });

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<AdminNominationPayload>({
      defaultValues: { metrics: [{ metricName: '', metricValue: '', metricBenchmark: '' }] },
      mode: 'onChange',
    });

  const reportOptions = reports.map((r) => ({
    value: String(r.teamMemberId),
    label: `${r.teamMemberNames} ${r.teamMemberSurnames}${r.workdayId ? ` (${r.workdayId})` : ''}`,
  }));
  register('nomineeId', { required: 'Select a team member', validate: (v) => !isNaN(v) || 'Select a team member' });
  const watchedNomineeId = watch('nomineeId');

  const onSubmit = async (data: AdminNominationPayload) => {
    if (!activeCycle) return;
    try {
      await nominationsApi.createAdmin({ ...data, cycId: activeCycle.cycId });
      toast({ title: 'Administrative nomination submitted' });
    } catch {
      toast({ title: 'Error submitting nomination', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <CardTitle>Administrative Nomination</CardTitle>

          <div>
            <Label>Nominated team member</Label>
            <ComboBox
              options={reportOptions}
              value={watchedNomineeId ? String(watchedNomineeId) : ''}
              onValueChange={(v) => setValue('nomineeId', parseInt(v, 10), { shouldValidate: true })}
              placeholder="Search your team..."
            />
            {errors.nomineeId && <p className="text-destructive text-sm mt-1">{errors.nomineeId.message}</p>}
          </div>

          <div>
            <Label>Main achievement description</Label>
            <Textarea
              {...register('achievementText', {
                required: true,
                minLength: { value: 150, message: 'Minimum 150 characters' },
                maxLength: { value: 1200, message: 'Maximum 1200 characters' },
              })}
              placeholder="Describe what the team member did, in what context, and what the impact was..."
              rows={6}
            />
            <span className="text-xs text-muted-foreground">{watch('achievementText', '').length} / 1200</span>
            {errors.achievementText && <p className="text-destructive text-sm">{errors.achievementText.message}</p>}
          </div>

          <div>
            <Label>Quantitative performance metrics</Label>
            <MetricsTable control={control} register={register} />
          </div>

          <div>
            <Label>How did they exceed role expectations?</Label>
            <Textarea
              {...register('adminExceedsRole', { required: true, minLength: 100, maxLength: 600 })}
              placeholder="Explain how they went beyond their job description..."
              rows={4}
            />
            {errors.adminExceedsRole && <p className="text-destructive text-sm">Minimum 100 characters</p>}
          </div>

          <div>
            <Label>Customer or business impact</Label>
            <Textarea
              {...register('adminClientImpact', { required: true, minLength: 80, maxLength: 500 })}
              rows={3}
            />
            {errors.adminClientImpact && <p className="text-destructive text-sm">Minimum 80 characters</p>}
          </div>

          <div>
            <Label>Alignment with TELUS values</Label>
            <div className="flex flex-col gap-2 mt-2">
              {TELUS_VALUES.map((v) => (
                <Controller
                  key={v}
                  name="valuesSelected"
                  control={control}
                  render={({ field }) => {
                    const selected: string[] = field.value ?? [];
                    return (
                      <label className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                          checked={selected.includes(v)}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? [...selected, v] : selected.filter((s) => s !== v))
                          }
                        />
                        {v}
                      </label>
                    );
                  }}
                />
              ))}
            </div>
            <Textarea
              {...register('valuesDescription')}
              placeholder="Briefly justify how it reflects each selected value"
              rows={2}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Confidence level in nomination (1–5)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              1 = Good but not exceptional · 3 = Definitely deserves recognition · 5 = Best nomination of the cycle
            </p>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex flex-col items-center cursor-pointer gap-1">
                  <input
                    type="radio"
                    value={n}
                    {...register('adminConfidenceLevel', { required: true, valueAsNumber: true })}
                  />
                  <span className="text-sm">{n}</span>
                </label>
              ))}
            </div>
            {errors.adminConfidenceLevel && <p className="text-destructive text-sm">Select a confidence level</p>}
          </div>

          <div>
            <Label>Support files (optional)</Label>
            <Controller
              name="attachments"
              control={control}
              render={({ field }) => (
                <FileUpload
                  maxFiles={3}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit nomination'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

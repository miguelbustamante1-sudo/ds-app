import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { BackToHubButton } from '@/components/BackToHubButton';
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
import { formatUTCDate } from '@/lib/utils';
import { TELUS_VALUES } from '@/constants/telusValues';

interface ActiveMember { teamMemberId: number; workdayId: string | null; teamMemberNames: string; teamMemberSurnames: string; }

export default function AdminNominationPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const { data: activeCycle } = useQuery({ queryKey: ['tp-active-cycle'], queryFn: cyclesApi.getActive });
  const { data: members = [] } = useQuery<ActiveMember[]>({
    queryKey: ['my-reports-complete'],
    queryFn: () => apiGet<ActiveMember[]>('/api/team-members/my-reports?hierarchy=complete'),
  });

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting, isValid } } =
    useForm<AdminNominationPayload>({
      defaultValues: { metrics: [{ metricName: '', metricValue: '', metricBenchmark: '' }] },
      mode: 'onChange',
    });

  const reportOptions = members.map((m) => ({
    value: String(m.teamMemberId),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}${m.workdayId ? ` (${m.workdayId})` : ''}`,
  }));
  register('nomineeId', { required: 'Select a team member', validate: (v) => !isNaN(v) || 'Select a team member' });
  const watchedNomineeId = watch('nomineeId');

  const onSubmit = async (data: AdminNominationPayload) => {
    if (!activeCycle) return;
    try {
      await nominationsApi.createAdmin({ ...data, cycId: activeCycle.cycId, adminConfidenceLevel: Number(data.adminConfidenceLevel) });
      reset({
        nomineeId: undefined,
        achievementText: '',
        adminExceedsRole: '',
        adminClientImpact: '',
        adminConfidenceLevel: undefined,
        valuesSelected: [],
        valuesDescription: '',
        attachments: [],
        metrics: [{ metricName: '', metricValue: '', metricBenchmark: '' }],
      });
      setSubmitted(true);
    } catch {
      toast({ title: 'Error submitting nomination', variant: 'destructive' });
    }
  };

  if (submitted) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-4">
        <BackToHubButton hubPath="/top-performers-hub" />
        <div className="text-center space-y-4">
          <p className="text-2xl font-bold text-[--color-uds-system-green-600]">Nomination submitted!</p>
          <p className="text-muted-foreground">Your nomination was registered successfully.</p>
          <Button onClick={() => setSubmitted(false)}>Submit another nomination</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <BackToHubButton hubPath="/top-performers-hub" />
      {activeCycle && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="font-semibold text-foreground">{activeCycle.cycName}</span>
          <span className="text-muted-foreground">
            Nominations: {formatUTCDate(activeCycle.cycNominationsStart)} – {formatUTCDate(activeCycle.cycNominationsEnd)}
          </span>
        </div>
      )}
      <Card>
        <CardContent className="pt-6 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)}>
          <CardTitle>Administrative Nomination</CardTitle>

          <div>
            <Label>Nominated team member <span className="text-destructive">*</span></Label>
            <ComboBox
              options={reportOptions}
              value={watchedNomineeId ? String(watchedNomineeId) : ''}
              onValueChange={(v) => setValue('nomineeId', parseInt(v, 10), { shouldValidate: true })}
              placeholder="Search your team..."
            />
            {errors.nomineeId && <p className="text-destructive text-sm mt-1">{errors.nomineeId.message}</p>}
          </div>

          <div>
            <Label>Main achievement description <span className="text-destructive">*</span></Label>
            <Textarea
              {...register('achievementText', {
                required: true,
                minLength: { value: 150, message: 'Minimum 150 characters' },
                maxLength: { value: 1500, message: 'Maximum 1500 characters' },
              })}
              placeholder="Describe what the team member did, in what context, and what the impact was..."
              rows={6}
            />
            <span className="text-xs text-muted-foreground">{watch('achievementText', '').length} / 1500</span>
            {errors.achievementText && <p className="text-destructive text-sm">{errors.achievementText.message}</p>}
          </div>

          <div>
            <Label>Quantitative performance metrics <span className="text-destructive">*</span></Label>
            <MetricsTable control={control} register={register} />
          </div>

          <div>
            <Label>How did they exceed role expectations? <span className="text-destructive">*</span></Label>
            <Textarea
              {...register('adminExceedsRole', { required: 'This field is required' })}
              placeholder="Explain how they went beyond their job description..."
              rows={4}
            />
            {errors.adminExceedsRole && <p className="text-destructive text-sm">{errors.adminExceedsRole.message}</p>}
          </div>

          <div>
            <Label>Customer or business impact <span className="text-destructive">*</span></Label>
            <Textarea
              {...register('adminClientImpact', {
                required: 'This field is required',
                minLength: { value: 80, message: 'Minimum 80 characters' },
              })}
              rows={3}
            />
            {errors.adminClientImpact && <p className="text-destructive text-sm">{errors.adminClientImpact.message}</p>}
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
            <Label>Confidence level in nomination (1–5) <span className="text-destructive">*</span></Label>
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
            <Label>Support files</Label>
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

          <Button type="submit" disabled={isSubmitting || !isValid} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit nomination'}
          </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

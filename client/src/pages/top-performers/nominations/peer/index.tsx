import { useForm, Controller } from 'react-hook-form';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { nominationsApi } from '@/api/topPerformers/nominations';
import type { PeerNominationPayload } from '@/api/topPerformers/nominations';
import { cyclesApi } from '@/api/topPerformers/cycles';
import { apiGet } from '@/lib/api';
import { TELUS_VALUES } from '@/constants/telusValues';
const DRAFT_KEY = 'tp-peer-nomination-draft';

interface ActiveMember { teamMemberId: number; workdayId: string | null; teamMemberNames: string; teamMemberSurnames: string; }

export default function PeerNominationPage() {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: activeCycle } = useQuery({ queryKey: ['tp-active-cycle'], queryFn: cyclesApi.getActive });
  const { data: activeMembers = [] } = useQuery<ActiveMember[]>({
    queryKey: ['active-team-members'],
    queryFn: () => apiGet<ActiveMember[]>('/api/team-members/active'),
  });

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors, isValid } } =
    useForm<PeerNominationPayload>({ mode: 'onChange' });

  const achievementText = watch('achievementText', '');
  register('nomineeId', { required: 'Select a nominee', validate: (v) => !isNaN(v) || 'Select a nominee' });
  const watchedNomineeId = watch('nomineeId');

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved) as Partial<PeerNominationPayload>;
        Object.entries(draft).forEach(([k, v]) => setValue(k as keyof PeerNominationPayload, v as never));
      } catch { /* ignore malformed draft */ }
    }
    autosaveRef.current = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()));
    }, 30000);
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current); };
  }, [getValues, setValue]);

  const onSubmit = async (data: PeerNominationPayload) => {
    if (!activeCycle) return;
    try {
      await nominationsApi.createPeer({ ...data, cycId: activeCycle.cycId });
      localStorage.removeItem(DRAFT_KEY);
      setSubmitted(true);
      setConfirmOpen(false);
      toast({ title: `Nomination submitted for ${activeCycle.cycName}` });
    } catch {
      toast({ title: 'Error submitting nomination', variant: 'destructive' });
    }
  };

  const memberOptions = activeMembers.map((m) => ({
    value: String(m.teamMemberId),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}${m.workdayId ? ` (${m.workdayId})` : ''}`,
  }));

  if (submitted) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-2xl font-bold text-green-600">Nomination submitted!</p>
        <p className="text-muted-foreground">Your nomination was registered successfully.</p>
        <Button onClick={() => setSubmitted(false)}>Submit another nomination</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <CardTitle>Nominate a Peer</CardTitle>

          <div>
            <Label>Who do you want to nominate?</Label>
            <ComboBox
              options={memberOptions}
              value={watchedNomineeId ? String(watchedNomineeId) : ''}
              onValueChange={(v) => setValue('nomineeId', parseInt(v, 10), { shouldValidate: true })}
              placeholder="Search by name..."
            />
            {errors.nomineeId && <p className="text-destructive text-sm mt-1">{errors.nomineeId.message}</p>}
          </div>

          <div>
            <Label>What did this person do to deserve being a Top Performer?</Label>
            <Textarea
              {...register('achievementText', {
                required: 'Required',
                minLength: { value: 80, message: 'Minimum 80 characters' },
                maxLength: { value: 800, message: 'Maximum 800 characters' },
              })}
              placeholder="Describe the achievement, situation, or specific contribution you observed..."
              rows={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              {errors.achievementText && <p className="text-destructive">{errors.achievementText.message}</p>}
              <span className="ml-auto">{achievementText.length} / 800</span>
            </div>
            {achievementText.length > 0 && achievementText.length < 80 && (
              <p className="text-amber-600 text-xs mt-1">
                Tip: add more detail to strengthen the nomination.
              </p>
            )}
          </div>

          <div>
            <Label>Do you have any quantitative data? (optional)</Label>
            <Textarea
              {...register('quantitativeData')}
              placeholder="e.g. Achieved 95% CSAT that month, or resolved 40 tickets in a day."
              rows={2}
            />
          </div>

          <div>
            <Label>How does this achievement reflect TELUS values? (optional)</Label>
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
              placeholder="Briefly describe how it reflects these values (optional, max 200 chars)"
              maxLength={200}
              rows={2}
              className="mt-2"
            />
          </div>

          <div>
            <Label>What is your relationship with the nominee?</Label>
            <Controller
              name="nominatorRelationship"
              control={control}
              rules={{ required: 'Select an option' }}
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="mt-2 space-y-1">
                  {[
                    { value: 'SAME_TEAM', label: 'Same team / LOB' },
                    { value: 'OTHER_TEAM', label: 'Other team / LOB' },
                    { value: 'PROJECT', label: 'Project-based interaction' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value={opt.value} />
                      {opt.label}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
            {errors.nominatorRelationship && (
              <p className="text-destructive text-sm mt-1">{errors.nominatorRelationship.message}</p>
            )}
          </div>

          <Button
            type="button"
            disabled={!isValid}
            onClick={() => setConfirmOpen(true)}
            className="w-full"
          >
            Review and submit nomination
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm nomination</DialogTitle></DialogHeader>
          <div className="text-sm space-y-2 max-h-60 overflow-y-auto">
            <p><strong>Achievement:</strong> {watch('achievementText')}</p>
            {watch('quantitativeData') && <p><strong>Metrics:</strong> {watch('quantitativeData')}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Edit</Button>
            <Button onClick={handleSubmit(onSubmit)}>Confirm and submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

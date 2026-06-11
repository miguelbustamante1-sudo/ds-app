import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload/FileUpload';
import { nominationsApi } from '@/api/topPerformers/nominations';
import type { CustomerNominationPayload } from '@/api/topPerformers/nominations';
import { cyclesApi } from '@/api/topPerformers/cycles';
import { apiGet } from '@/lib/api';

const CHANNELS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'CHAT', label: 'Live chat' },
  { value: 'CSAT', label: 'CSAT/NPS survey' },
  { value: 'CALL', label: 'Phone call (transcript)' },
  { value: 'SOCIAL', label: 'Social media' },
  { value: 'OTHER', label: 'Other' },
];

interface ActiveMember { teamMemberId: number; workdayId: string | null; teamMemberNames: string; teamMemberSurnames: string; }

type CustomerFormValues = CustomerNominationPayload & { showClientName: boolean; clientName?: string };

export default function CustomerNominationPage() {
  const { toast } = useToast();
  const { data: activeCycle } = useQuery({ queryKey: ['tp-active-cycle'], queryFn: cyclesApi.getActive });
  const { data: members = [] } = useQuery<ActiveMember[]>({
    queryKey: ['active-team-members'],
    queryFn: () => apiGet<ActiveMember[]>('/api/team-members/active'),
  });

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<CustomerFormValues>({
      defaultValues: { showClientName: false },
    });

  const feedbackText = watch('achievementText', '');
  const showClientName = watch('showClientName');
  register('nomineeId', { required: 'Select a team member', validate: (v) => !isNaN(v) || 'Select a team member' });
  register('customerChannel', { required: 'Select a channel' });
  const watchedNomineeId = watch('nomineeId');
  const watchedChannel = watch('customerChannel');

  const memberOptions = members.map((m) => ({
    value: String(m.teamMemberId),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}${m.workdayId ? ` (${m.workdayId})` : ''}`,
  }));

  const onSubmit = async (data: CustomerFormValues) => {
    if (!activeCycle) return;
    try {
      const payload: CustomerNominationPayload = {
        cycId: activeCycle.cycId,
        nomineeId: data.nomineeId,
        achievementText: data.achievementText,
        customerChannel: data.customerChannel,
        feedbackDate: data.feedbackDate,
        attachments: data.attachments,
      };
      await nominationsApi.createCustomer(payload);
      toast({ title: 'Customer feedback recorded as nomination' });
    } catch {
      toast({ title: 'Error recording feedback', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <CardTitle>Voice of Customer — Nomination</CardTitle>

          <div>
            <Label>Nominated team member</Label>
            <ComboBox
              options={memberOptions}
              value={watchedNomineeId ? String(watchedNomineeId) : ''}
              onValueChange={(v) => setValue('nomineeId', parseInt(v, 10), { shouldValidate: true })}
              placeholder="Search by name..."
            />
            {errors.nomineeId && <p className="text-destructive text-sm mt-1">{errors.nomineeId.message}</p>}
          </div>

          {/* Plain textarea — FLAG-02: rich text removed intentionally */}
          <div>
            <Label>Customer feedback (original text)</Label>
            <Textarea
              {...register('achievementText', {
                required: 'Required',
                minLength: { value: 50, message: 'Minimum 50 characters' },
              })}
              placeholder="Paste the exact email, chat, survey, or customer comment text here..."
              rows={6}
            />
            {feedbackText.length > 0 && feedbackText.length < 80 && (
              <p className="text-amber-600 text-xs mt-1">
                This feedback is short. Consider adding context if the customer shared additional information verbally.
              </p>
            )}
            {errors.achievementText && <p className="text-destructive text-sm mt-1">{errors.achievementText.message}</p>}
          </div>

          <div>
            <Label>Feedback source channel</Label>
            <ComboBox
              options={CHANNELS}
              value={watchedChannel ?? ''}
              onValueChange={(v) => setValue('customerChannel', v, { shouldValidate: true })}
              placeholder="Select a channel..."
            />
            {errors.customerChannel && <p className="text-destructive text-sm mt-1">{errors.customerChannel.message}</p>}
          </div>

          <div>
            <Label>Date feedback was received</Label>
            <Input
              type="date"
              {...register('feedbackDate', { required: 'Required' })}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.feedbackDate && <p className="text-destructive text-sm mt-1">{errors.feedbackDate.message}</p>}
          </div>

          <div className="flex items-center gap-3">
            <Controller
              name="showClientName"
              control={control}
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
            <Label>Did the customer authorize sharing their name?</Label>
          </div>
          {showClientName && (
            <Input {...register('clientName')} placeholder="Customer name (optional)" />
          )}

          <div>
            <Label>Support files (optional)</Label>
            <Controller
              name="attachments"
              control={control}
              render={({ field }) => (
                <FileUpload
                  maxFiles={2}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Recording...' : 'Record customer nomination'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

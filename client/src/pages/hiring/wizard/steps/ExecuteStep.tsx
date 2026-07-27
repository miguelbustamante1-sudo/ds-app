import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { EndorsementWithDetailsDTO, HiringDTO, UpdateHiringDTO } from '@shared/dto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiPatch, ApiError } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { TeamLeadComboBox } from '../components/TeamLeadComboBox';
import type { ExecuteHiringResultDTO, HiringFormData } from '../types';

interface ExecuteStepProps {
  endorsement: EndorsementWithDetailsDTO;
  hiring: HiringDTO;
  /** Called after a successful execution with the orchestrator's full result. */
  onExecuted: (result: ExecuteHiringResultDTO) => void;
}

export function ExecuteStep({ endorsement, hiring, onExecuted }: ExecuteStepProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HiringFormData>({
    defaultValues: {
      startDate: '',
      billableDate: '',
      workdayId: '',
      teamLeadId: '',
    },
  });

  // Billable date mirrors start date unless the user has directly edited billable date.
  const billableDateTouched = useRef(false);

  useEffect(() => {
    reset({
      startDate: hiring.startDate ? formatUTCDate(hiring.startDate, 'yyyy-MM-dd') : '',
      billableDate: hiring.billableDate ? formatUTCDate(hiring.billableDate, 'yyyy-MM-dd') : '',
      workdayId: hiring.workdayId ?? '',
      teamLeadId: hiring.teamLeadId != null ? String(hiring.teamLeadId) : '',
    });
    billableDateTouched.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiring.id]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload: UpdateHiringDTO = {
        startDate: data.startDate,
        billableDate: data.billableDate,
        workdayId: data.workdayId.trim(),
        teamLeadId: data.teamLeadId ? Number(data.teamLeadId) : null,
      };
      const result = await apiPatch<ExecuteHiringResultDTO, UpdateHiringDTO>(
        `/api/hiring/${hiring.id}/execute`,
        payload,
      );
      toast({ title: 'Success', description: 'Hiring executed successfully' });
      onExecuted(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to execute hiring';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Confirmation summary */}
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm rounded-lg border bg-card p-6">
        <div>
          <dt className="text-muted-foreground">Candidate</dt>
          <dd>
            {endorsement.candidateFirstName} {endorsement.candidateLastName}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Project</dt>
          <dd>{endorsement.project?.projectName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Endorsement Start Date</dt>
          <dd>{endorsement.startDate ? formatUTCDate(endorsement.startDate) : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Billing Rate</dt>
          <dd>
            {endorsement.billingRate != null
              ? `${endorsement.billingRateCurrency ?? ''} ${endorsement.billingRate}`.trim()
              : '—'}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="execStartDate">
            Start Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="execStartDate"
            type="date"
            {...register('startDate', {
              required: 'Start date is required',
              onChange: (e) => {
                if (!billableDateTouched.current) {
                  setValue('billableDate', e.target.value, { shouldValidate: true });
                }
              },
            })}
          />
          {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
        </div>

        {/* Billable Date */}
        <div className="space-y-2">
          <Label htmlFor="execBillableDate">
            Billable Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="execBillableDate"
            type="date"
            {...register('billableDate', {
              required: 'Billable date is required',
              onChange: () => {
                billableDateTouched.current = true;
              },
            })}
          />
          {errors.billableDate && <p className="text-sm text-destructive">{errors.billableDate.message}</p>}
        </div>

        {/* Workday ID — required to execute */}
        <div className="space-y-2">
          <Label htmlFor="execWorkdayId">
            Workday ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="execWorkdayId"
            type="text"
            {...register('workdayId', {
              validate: (v) => !!v?.trim() || 'Workday ID is required to execute a hiring.',
            })}
          />
          {errors.workdayId && <p className="text-sm text-destructive">{errors.workdayId.message}</p>}
        </div>

        {/* Team Lead */}
        <div className="space-y-2 md:col-span-2">
          <Label>Team Lead</Label>
          <Controller
            name="teamLeadId"
            control={control}
            render={({ field }) => (
              <TeamLeadComboBox value={field.value} onValueChange={field.onChange} />
            )}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Executing...' : 'Execute'}
        </Button>
      </div>
    </form>
  );
}

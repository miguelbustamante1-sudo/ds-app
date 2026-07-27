import { useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { CreateHiringDTO, EndorsementWithDetailsDTO, HiringDTO } from '@shared/dto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiPost, ApiError } from '@/lib/api';
import { TeamLeadComboBox } from '../components/TeamLeadComboBox';
import type { HiringFormData } from '../types';

interface HiringDetailsStepProps {
  endorsement: EndorsementWithDetailsDTO;
  /** Called after a successful draft save so the wizard state machine can re-evaluate and advance. */
  onSaved: () => void;
}

/**
 * Step 4 — S3 only (no Hiring record exists yet for this endorsement). Once a draft is created,
 * the wizard moves on to ExecuteStep (Step 5), which handles both S4 and S5 as a single
 * fully-editable form — see the WizardState doc comment in ../types.ts for why S4/S5 share a screen.
 */
export function HiringDetailsStep({ endorsement, onSaved }: HiringDetailsStepProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    setValue,
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

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload: CreateHiringDTO = {
        endorsementId: endorsement.endorsementId,
        startDate: data.startDate,
        billableDate: data.billableDate,
        workdayId: data.workdayId.trim() || null,
        teamLeadId: data.teamLeadId ? Number(data.teamLeadId) : null,
      };
      await apiPost<HiringDTO, CreateHiringDTO>('/api/hiring', payload);
      toast({ title: 'Success', description: 'Hiring draft saved' });
      onSaved();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save hiring draft';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate">
            Start Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="startDate"
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
          <Label htmlFor="billableDate">
            Billable Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="billableDate"
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

        {/* Workday ID */}
        <div className="space-y-2">
          <Label htmlFor="workdayId">
            Workday ID <span className="text-muted-foreground text-xs">(required to execute later)</span>
          </Label>
          <Input id="workdayId" type="text" {...register('workdayId')} />
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
          {isSubmitting ? 'Saving...' : 'Save Draft'}
        </Button>
      </div>
    </form>
  );
}

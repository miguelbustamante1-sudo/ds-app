import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EndorsementClientComboBox } from '@/pages/endorsements/components/EndorsementClientComboBox';
import { EndorsementProjectComboBox } from '@/pages/endorsements/components/EndorsementProjectComboBox';
import { EndorsementClientManagerEmailField } from '@/pages/endorsements/components/EndorsementClientManagerEmailField';
import { EndorsementCountryComboBox } from '@/pages/endorsements/components/EndorsementCountryComboBox';
import type { WizardFormReturn } from '../types';

const STEP_1_FIELDS = ['candidateFirstName', 'candidateLastName', 'clientId', 'projectId', 'clientManagerEmail', 'countryId', 'startDate'] as const;

interface CandidateEntryStepProps {
  form: WizardFormReturn;
  onNext: () => void;
  /** True once the endorsement already exists — the candidate/role are locked, this step is review-only. */
  readOnly?: boolean;
}

export function CandidateEntryStep({ form, onNext, readOnly = false }: CandidateEntryStepProps) {
  const {
    register,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = form;

  const clientIdValue = watch('clientId');
  const projectIdValue = watch('projectId');
  const countryIdValue = watch('countryId');

  // Reset project when client changes (candidate-entry stage only — never once locked for review)
  useEffect(() => {
    if (readOnly) return;
    setValue('projectId', '', { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIdValue]);

  async function handleNext() {
    const valid = await trigger(STEP_1_FIELDS);
    if (valid) onNext();
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Candidate First Name */}
        <div className="space-y-2">
          <Label htmlFor="candidateFirstName">
            Candidate First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="candidateFirstName"
            disabled={readOnly}
            {...register('candidateFirstName', { required: 'Candidate first name is required' })}
          />
          {errors.candidateFirstName && (
            <p className="text-sm text-destructive">{errors.candidateFirstName.message}</p>
          )}
        </div>

        {/* Candidate Last Name */}
        <div className="space-y-2">
          <Label htmlFor="candidateLastName">
            Candidate Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="candidateLastName"
            disabled={readOnly}
            {...register('candidateLastName', { required: 'Candidate last name is required' })}
          />
          {errors.candidateLastName && (
            <p className="text-sm text-destructive">{errors.candidateLastName.message}</p>
          )}
        </div>

        {/* Client */}
        <div className="space-y-2">
          <Label>
            Client <span className="text-destructive">*</span>
          </Label>
          <EndorsementClientComboBox
            value={clientIdValue}
            onValueChange={(value) => setValue('clientId', value, { shouldValidate: true })}
            disabled={readOnly}
          />
        </div>

        {/* Client Manager Email */}
        <div className="space-y-2">
          <Label htmlFor="clientManagerEmail">
            Client Manager Email <span className="text-destructive">*</span>
          </Label>
          <EndorsementClientManagerEmailField
            value={watch('clientManagerEmail')}
            onChange={(val) => setValue('clientManagerEmail', val, { shouldValidate: true })}
            clientId={clientIdValue}
            inputProps={{
              id: 'clientManagerEmail',
              disabled: readOnly,
              ...register('clientManagerEmail', {
                required: 'Client manager email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Invalid email format',
                },
              }),
            }}
          />
          {errors.clientManagerEmail && (
            <p className="text-sm text-destructive">{errors.clientManagerEmail.message}</p>
          )}
        </div>

        {/* Project */}
        <div className="space-y-2">
          <Label>
            Project <span className="text-destructive">*</span>
          </Label>
          <EndorsementProjectComboBox
            value={projectIdValue}
            clientId={clientIdValue}
            onValueChange={(value) => setValue('projectId', value, { shouldValidate: true })}
            disabled={readOnly}
          />
          {errors.projectId && <p className="text-sm text-destructive">{errors.projectId.message}</p>}
          <input type="hidden" {...register('projectId', { required: 'Project is required' })} />
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate">
            Start Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="startDate"
            type="date"
            disabled={readOnly}
            {...register('startDate', { required: 'Start date is required' })}
          />
          {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label>
            Country <span className="text-destructive">*</span>
          </Label>
          <EndorsementCountryComboBox
            value={countryIdValue}
            onValueChange={(value) => setValue('countryId', value, { shouldValidate: true })}
            disabled={readOnly}
          />
          {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
          <input type="hidden" {...register('countryId', { required: 'Country is required' })} />
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="button" onClick={handleNext}>
            Next: Role &amp; Rate
            <ArrowRight size={16} className="ms-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { createCompensatoryTime, validateUsageRecord } from '@/services/compensatoryTime';
import type { ProjectOption } from '@/pages/comp-time/hooks/useActiveProjects';
import { combineDateAndTime } from '@/pages/comp-time/utils';

interface UsageFormData {
  projectId: string;
  subject: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface UsageEntryFormProps {
  teamMemberId: number;
  projects: ProjectOption[];
  projectsLoading: boolean;
  onSuccess: () => void;
}

export function UsageEntryForm({
  teamMemberId,
  projects,
  projectsLoading,
  onSuccess,
}: UsageEntryFormProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UsageFormData>({
    defaultValues: {
      projectId: '',
      subject: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
    },
  });

  const watchedProjectId = useWatch({ control, name: 'projectId' });
  const watchedStartDate = useWatch({ control, name: 'startDate' });
  const watchedStartTime = useWatch({ control, name: 'startTime' });
  const watchedEndDate   = useWatch({ control, name: 'endDate' });
  const watchedEndTime   = useWatch({ control, name: 'endTime' });

  const [computedHours, setComputedHours]   = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!watchedStartDate || !watchedStartTime || !watchedEndDate || !watchedEndTime) {
      setComputedHours(null);
      return;
    }
    const start = new Date(`${watchedStartDate}T${watchedStartTime}`).getTime();
    const end   = new Date(`${watchedEndDate}T${watchedEndTime}`).getTime();
    const hours = end > start ? (end - start) / 3_600_000 : null;
    setComputedHours(hours);
  }, [watchedStartDate, watchedStartTime, watchedEndDate, watchedEndTime]);

  useEffect(() => {
    if (
      !watchedProjectId ||
      !watchedStartDate ||
      !watchedStartTime ||
      !watchedEndDate ||
      !watchedEndTime
    ) {
      setValidationError(null);
      return;
    }

    let cancelled = false;

    validateUsageRecord(
      teamMemberId,
      Number(watchedProjectId),
      combineDateAndTime(watchedStartDate, watchedStartTime),
      combineDateAndTime(watchedEndDate, watchedEndTime),
    )
      .then((result) => {
        if (!cancelled) {
          setValidationError(result.valid ? null : (result.error ?? 'Invalid entry'));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setValidationError(err instanceof Error ? err.message : 'Validation failed');
        }
      });

    return () => { cancelled = true; };
  }, [
    watchedProjectId,
    watchedStartDate,
    watchedStartTime,
    watchedEndDate,
    watchedEndTime,
    teamMemberId,
  ]);

  const onSubmit = async (data: UsageFormData) => {
    if (validationError) {
      toast({ title: 'Validation Error', description: validationError, variant: 'destructive' });
      return;
    }

    const totalCreditedHours = computedHours ?? 0;

    try {
      await createCompensatoryTime({
        teamMemberId,
        projectId: Number(data.projectId),
        subject: data.subject.trim(),
        startingTime: combineDateAndTime(data.startDate, data.startTime),
        endingTime: combineDateAndTime(data.endDate, data.endTime),
        dayHours: 0,
        nightHours: 0,
        totalCreditedHours,
        compType: 'USED',
      });
      toast({ title: 'Saved', description: 'Usage record submitted successfully.' });
      reset();
      setComputedHours(null);
      setValidationError(null);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save record';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <CardTitle className="flex items-center gap-2 mb-6">
          New Usage Entry
        </CardTitle>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Project <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={projects}
                value={watchedProjectId}
                onValueChange={(val) => setValue('projectId', val, { shouldValidate: true })}
                placeholder={projectsLoading ? 'Loading...' : 'Select a project'}
                searchPlaceholder="Search projects..."
                emptyMessage="No projects found."
                disabled={projectsLoading}
              />
              {errors.projectId && (
                <p className="text-sm text-destructive">{errors.projectId.message}</p>
              )}
              <input
                type="hidden"
                {...register('projectId', { required: 'Project is required' })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageSubject">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="usageSubject"
                placeholder="Brief description"
                {...register('subject', { required: 'Description is required' })}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageStartDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="usageStartDate"
                type="date"
                {...register('startDate', { required: 'Start date is required' })}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageStartTime">
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="usageStartTime"
                type="time"
                {...register('startTime', { required: 'Start time is required' })}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageEndDate">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="usageEndDate"
                type="date"
                {...register('endDate', { required: 'End date is required' })}
              />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageEndTime">
                End Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="usageEndTime"
                type="time"
                {...register('endTime', { required: 'End time is required' })}
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">{errors.endTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Hours</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                {computedHours !== null ? computedHours.toFixed(2) : '—'}
              </div>
            </div>
          </div>

          {validationError && (
            <p className="text-sm text-destructive">{validationError}</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !!validationError}>
              {isSubmitting ? 'Saving…' : 'Submit Entry'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

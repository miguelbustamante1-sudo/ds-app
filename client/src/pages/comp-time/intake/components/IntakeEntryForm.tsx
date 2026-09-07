import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { createCompensatoryTime, getHoursPerShift } from '@/services/compensatoryTime';
import type { ProjectOption } from '@/pages/comp-time/hooks/useActiveProjects';
import { combineDateAndTime } from '@/pages/comp-time/utils';

interface IntakeFormData {
  projectId: string;
  subject: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface IntakeEntryFormProps {
  teamMemberId: number;
  projects: ProjectOption[];
  projectsLoading: boolean;
  onSuccess: () => void;
}

export function IntakeEntryForm({
  teamMemberId,
  projects,
  projectsLoading,
  onSuccess,
}: IntakeEntryFormProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IntakeFormData>({
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

  const [dayHours, setDayHours]         = useState<number | null>(null);
  const [nightHours, setNightHours]     = useState<number | null>(null);
  const [hoursLoading, setHoursLoading] = useState(false);

  useEffect(() => {
    if (
      !watchedProjectId ||
      !watchedStartDate ||
      !watchedStartTime ||
      !watchedEndDate ||
      !watchedEndTime
    ) {
      setDayHours(null);
      setNightHours(null);
      return;
    }

    let cancelled = false;
    setHoursLoading(true);

    getHoursPerShift(
      teamMemberId,
      Number(watchedProjectId),
      combineDateAndTime(watchedStartDate, watchedStartTime),
      combineDateAndTime(watchedEndDate, watchedEndTime),
    )
      .then((result) => {
        if (!cancelled) {
          setDayHours(result.dayHours);
          setNightHours(result.nightHours);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDayHours(null);
          setNightHours(null);
        }
      })
      .finally(() => {
        if (!cancelled) setHoursLoading(false);
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

  const onSubmit = async (data: IntakeFormData) => {
    try {
      await createCompensatoryTime({
        teamMemberId,
        projectId: Number(data.projectId),
        subject: data.subject.trim(),
        startingTime: combineDateAndTime(data.startDate, data.startTime),
        endingTime: combineDateAndTime(data.endDate, data.endTime),
        dayHours: dayHours ?? 0,
        nightHours: nightHours ?? 0,
        compType: 'EARNED',
      });
      toast({ title: 'Saved', description: 'Record submitted successfully.' });
      reset();
      setDayHours(null);
      setNightHours(null);
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
          New Earned Entry
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
              <Label htmlFor="subject">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="Brief description"
                {...register('subject', { required: 'Description is required' })}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate', { required: 'Start date is required' })}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                {...register('startTime', { required: 'Start time is required' })}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate', { required: 'End date is required' })}
              />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">
                End Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                {...register('endTime', { required: 'End time is required' })}
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">{errors.endTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Day Hours</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                {hoursLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  dayHours !== null ? dayHours.toFixed(2) : '—'
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Night Hours</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                {hoursLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  nightHours !== null ? nightHours.toFixed(2) : '—'
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Submit Entry'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

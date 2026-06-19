import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CalendarRange, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiPut } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import type { TeamMemberDTO, UpdateTeamMemberDTO } from '@shared/dto';

interface FormValues {
  teamMemberStartDate: string;
  teamMemberEndDate: string;
}

interface Props {
  teamMember: TeamMemberDTO;
  onSaved: () => void;
}

export function DatesSection({ teamMember, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);
  const [showEndDateConfirm, setShowEndDateConfirm] = useState(false);
  const [showClearEndDateConfirm, setShowClearEndDateConfirm] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const memberName = `${teamMember.teamMemberKnownAs || teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`;

  useEffect(() => {
    if (!editing) {
      reset({
        teamMemberStartDate: teamMember.teamMemberStartDate
          ? formatUTCDate(teamMember.teamMemberStartDate, 'yyyy-MM-dd')
          : '',
        teamMemberEndDate: teamMember.teamMemberEndDate
          ? formatUTCDate(teamMember.teamMemberEndDate, 'yyyy-MM-dd')
          : '',
      });
    }
  }, [teamMember, editing, reset]);

  function handleCancel() {
    reset();
    setEditing(false);
  }

  async function submitData(values: FormValues) {
    try {
      await apiPut<TeamMemberDTO, UpdateTeamMemberDTO>(
        `/api/team-members/${teamMember.teamMemberId}`,
        {
          teamMemberStartDate: values.teamMemberStartDate,
          teamMemberEndDate: values.teamMemberEndDate || null,
        },
      );
      toast({ title: 'Success', description: 'Dates updated' });
      setEditing(false);
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  }

  async function onSubmit(values: FormValues) {
    const originalEndDate = teamMember.teamMemberEndDate
      ? formatUTCDate(teamMember.teamMemberEndDate, 'yyyy-MM-dd')
      : '';
    const endDateSet = values.teamMemberEndDate !== originalEndDate && values.teamMemberEndDate !== '';
    const endDateCleared = originalEndDate !== '' && values.teamMemberEndDate === '';

    if (endDateSet) {
      setPendingData(values);
      setShowEndDateConfirm(true);
      return;
    }
    if (endDateCleared) {
      setPendingData(values);
      setShowClearEndDateConfirm(true);
      return;
    }
    await submitData(values);
  }

  async function handleEndDateConfirmed() {
    setShowEndDateConfirm(false);
    if (pendingData) {
      await submitData(pendingData);
      setPendingData(null);
    }
  }

  async function handleClearEndDateConfirmed() {
    setShowClearEndDateConfirm(false);
    if (pendingData) {
      await submitData(pendingData);
      setPendingData(null);
    }
  }

  return (
    <>
      <AlertDialog open={showEndDateConfirm} onOpenChange={setShowEndDateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm end date</AlertDialogTitle>
            <AlertDialogDescription>
              You are setting the end date for <strong>{memberName}</strong> to{' '}
              <strong>{pendingData?.teamMemberEndDate}</strong>.
              <br /><br />
              Once this date is reached, the system will automatically cancel:
              <br />
              &bull; All time-off requests with a start date after the end date.
              <br />
              &bull; Tentative requests that started before the end date but extend past it.
              <br /><br />
              Processing runs on a 24-hour cycle, so cancellations may take up to
              24 hours to take effect after the end date is reached.
              <br /><br />
              Please confirm the date is correct and not an error.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingData(null)}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndDateConfirmed}>Yes, confirm end date</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearEndDateConfirm} onOpenChange={setShowClearEndDateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove end date?</AlertDialogTitle>
            <AlertDialogDescription>
              You are removing the end date for <strong>{memberName}</strong>.
              <br /><br />
              Any time-off requests that were previously cancelled due to the
              attrition process will <strong>not</strong> be automatically
              reactivated. Those records must be reviewed and reactivated manually
              if needed.
              <br /><br />
              Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingData(null)}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearEndDateConfirmed}>Yes, remove end date</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              Dates
            </CardTitle>
            {!editing && (
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="ds-start">Start Date <span className="text-destructive">*</span></Label>
                <Input
                  id="ds-start"
                  type="date"
                  {...register('teamMemberStartDate', { required: 'Start date is required' })}
                />
                {errors.teamMemberStartDate && (
                  <p className="text-sm text-destructive">{errors.teamMemberStartDate.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="ds-end">End Date</Label>
                <Input id="ds-end" type="date" {...register('teamMemberEndDate')} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          ) : (
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                <dd className="text-sm mt-1">
                  {teamMember.teamMemberStartDate ? formatUTCDate(teamMember.teamMemberStartDate) : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">End Date</dt>
                <dd className="text-sm mt-1">
                  {teamMember.teamMemberEndDate ? formatUTCDate(teamMember.teamMemberEndDate) : '-'}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </>
  );
}

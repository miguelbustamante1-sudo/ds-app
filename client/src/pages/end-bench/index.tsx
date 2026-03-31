import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { ComboBox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import type { TeamMemberReportDTO } from '@shared/dto';
import { useActiveBenchRecord } from './hooks/useActiveBenchRecord';
import { useEndBench } from './hooks/useEndBench';

export function EndBenchPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMemberReportDTO[]>([]);

  const benchRecord = useActiveBenchRecord();

  const form = useEndBench({
    onSuccess: (message) => {
      toast({ title: 'Success', description: message });
      benchRecord.reset();
    },
    onError: (message) =>
      toast({ title: 'Error', description: message, variant: 'destructive' }),
  });

  // Fetch direct reports once on mount
  useEffect(() => {
    apiGet<TeamMemberReportDTO[]>('/api/team-members/my-reports?hierarchy=direct')
      .then(setTeamMembers)
      .catch(() => setTeamMembers([]));
  }, []);

  function handleTeamMemberChange(value: string) {
    const id = value ? Number(value) : null;
    form.setTeamMember(id);
    benchRecord.reset();
    if (id) {
      benchRecord.fetchActiveBench(id);
    }
  }

  const teamMemberOptions = teamMembers.map((m) => ({
    value: String(m.teamMemberId),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));

  const selectedTM = teamMembers.find(
    (m) => m.teamMemberId === form.selectedTeamMemberId,
  );
  const selectedTMName = selectedTM
    ? `${selectedTM.teamMemberNames} ${selectedTM.teamMemberSurnames}`
    : '';

  const tmSelected = form.selectedTeamMemberId !== null;
  const hasActiveBench = benchRecord.activeBenchRecord !== null;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>End Bench</ToolbarPageTitle>
          <ToolbarDescription>
            Return a team member from bench by closing their record
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 space-y-6">
        {/* Team Member selector */}
        <div className="space-y-1.5 max-w-sm">
          <Label>
            Team Member <span className="text-destructive">*</span>
          </Label>
          <ComboBox
            options={teamMemberOptions}
            value={form.selectedTeamMemberId ? String(form.selectedTeamMemberId) : ''}
            onValueChange={handleTeamMemberChange}
            placeholder="Select a team member..."
            searchPlaceholder="Search by name..."
          />
        </div>

        {/* Conditional section after TM is selected */}
        {tmSelected && (
          <>
            {benchRecord.isLoading ? (
              <Skeleton className="h-40 w-full max-w-lg" />
            ) : benchRecord.error ? (
              <p className="text-sm text-destructive">{benchRecord.error}</p>
            ) : !hasActiveBench ? (
              <p className="text-sm text-muted-foreground">
                No active bench record found for this team member.
              </p>
            ) : (
              <>
                {/* Read-only bench record card */}
                <Card className="max-w-lg">
                  <CardHeader>
                    <CardTitle>Active Bench Record</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Supervisor</dt>
                        <dd className="text-sm mt-0.5">
                          {benchRecord.activeBenchRecord!.supervisorName ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">
                          Functional Area
                        </dt>
                        <dd className="text-sm mt-0.5">
                          {benchRecord.activeBenchRecord!.functionalAreaName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Allocation</dt>
                        <dd className="text-sm mt-0.5">
                          {Math.round(benchRecord.activeBenchRecord!.allocation * 100)}%
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                        <dd className="text-sm mt-0.5">
                          {formatUTCDate(benchRecord.activeBenchRecord!.startDate)}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* End Date picker */}
                <div className="space-y-1.5 max-w-xs">
                  <Label>
                    End Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => form.setEndDate(e.target.value)}
                    min={benchRecord.activeBenchRecord!.startDate.split('T')[0]}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Validation error */}
        {form.validationError && (
          <p className="text-sm text-destructive">{form.validationError}</p>
        )}

        {/* Action row */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              benchRecord.activeBenchRecord &&
              form.openConfirm(benchRecord.activeBenchRecord)
            }
            disabled={!tmSelected || !hasActiveBench || benchRecord.isLoading}
          >
            End Bench
          </Button>
        </div>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={form.isConfirmOpen} onOpenChange={(open) => !open && form.closeConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Bench Period</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to end the bench period for{' '}
              <strong>{selectedTMName}</strong>. Their bench record will be
              closed as of <strong>{form.endDate}</strong>. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={form.closeConfirm} disabled={form.isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                benchRecord.activeBenchRecord &&
                form.submitEndBench(benchRecord.activeBenchRecord.benchId)
              }
              disabled={form.isSubmitting}
            >
              {form.isSubmitting ? 'Ending...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

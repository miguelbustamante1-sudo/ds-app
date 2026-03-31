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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api';
import type { TeamMemberReportDTO } from '@shared/dto';
import { useTeamMemberBenchData } from './hooks/useTeamMemberBenchData';
import { useBenchMove } from './hooks/useBenchMove';
import { ProjectAssignmentsBlock } from './components/ProjectAssignmentsBlock';
import { HierarchyBlock } from './components/HierarchyBlock';
import { AllocationBlock } from './components/AllocationBlock';
import { BenchMoveConfirmDialog } from './components/BenchMoveConfirmDialog';

export function BenchMovePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMemberReportDTO[]>([]);

  const benchData = useTeamMemberBenchData();

  const form = useBenchMove(benchData.projects, {
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (message) =>
      toast({ title: 'Error', description: message, variant: 'destructive' }),
  });

  // Fetch the direct reports list once on mount
  useEffect(() => {
    apiGet<TeamMemberReportDTO[]>('/api/team-members/my-reports?hierarchy=direct')
      .then(setTeamMembers)
      .catch(() => setTeamMembers([]));
  }, []);

  // When TM data loads, initialize the supervisor chain in the form
  useEffect(() => {
    if (!benchData.isLoading && benchData.supervisorChain.length > 0) {
      form.initSupervisorChain(benchData.supervisorChain);
    }
  }, [benchData.isLoading, benchData.supervisorChain]);

  // When a TM is selected, kick off all 3 parallel fetches
  function handleTeamMemberChange(value: string) {
    const id = value ? Number(value) : null;
    form.setTeamMember(id);
    benchData.reset();
    if (id) {
      benchData.fetchBenchData(id);
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

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Bench Move</ToolbarPageTitle>
          <ToolbarDescription>
            Move a team member to bench by updating their assignments
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

        {/* Conditional data section */}
        {form.selectedTeamMemberId && (
          <>
            {benchData.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <div className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-56" />
                  <Skeleton className="h-56" />
                </div>
              </div>
            ) : benchData.error ? (
              <p className="text-sm text-destructive">{benchData.error}</p>
            ) : (
              <>
                <ProjectAssignmentsBlock
                  projects={benchData.projects}
                  endDates={form.projectEndDates}
                  onEndDateChange={form.setEndDate}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <HierarchyBlock
                    supervisorOptions={benchData.supervisorOptions}
                    supervisorChain={form.displayChain}
                    selectedL1Id={form.newSupervisorId}
                    onL1Change={form.setSupervisor}
                  />
                  <AllocationBlock
                    functionalAreaId={form.functionalAreaId}
                    allocation={form.allocation}
                    startDate={form.startDate}
                    onFunctionalAreaChange={form.setFunctionalArea}
                    onAllocationChange={form.setAllocation}
                    onStartDateChange={form.setStartDate}
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
            onClick={form.openConfirm}
            disabled={!form.selectedTeamMemberId || benchData.isLoading}
          >
            Submit Bench Move
          </Button>
        </div>
      </div>

      <BenchMoveConfirmDialog
        isOpen={form.isConfirmOpen}
        teamMemberName={selectedTMName}
        onConfirm={form.submitBenchMove}
        onCancel={form.closeConfirm}
        isSubmitting={form.isSubmitting}
      />
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api';
import { useMyTeamMembers } from '@/hooks/useSupervisorTimeOff';
import { TeamMembersDataGrid } from '@/pages/timeoff/supervisor/components/TeamMembersDataGrid';
import { SupervisorSwapForm } from './components/SupervisorSwapForm';
import { SupervisorSwapList } from './components/SupervisorSwapList';
import { CancelSwapDialog } from './components/CancelSwapDialog';
import { useSupervisorTeamMemberSwaps } from './hooks/useSupervisorTeamMemberSwaps';
import { useSupervisorSwapOperations } from './hooks/useSupervisorSwapOperations';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export function SupervisorHolidaySwapsPage() {
  const { toast } = useToast();

  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberReportDTO | null>(null);
  const [editingSwap, setEditingSwap] = useState<HolidaySwapDTO | null>(null);
  const [cancelTarget, setCancelTarget] = useState<HolidaySwapDTO | null>(null);
  const [tentativeStatusId, setTentativeStatusId] = useState<number | null>(null);
  const [acknowledgedStatusId, setAcknowledgedStatusId] = useState<number | null>(null);
  const [rejectedStatusId, setRejectedStatusId] = useState<number | null>(null);

  const teamMembersHook = useMyTeamMembers({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const swapsHook = useSupervisorTeamMemberSwaps();

  const operationsHook = useSupervisorSwapOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  // Load status IDs once
  useEffect(() => {
    apiGet<Array<{ statusId: number; statusName: string }>>('/api/time-off-statuses')
      .then((statuses) => {
        const tentative = statuses.find((s) => s.statusName.toLowerCase() === 'tentative');
        const acknowledged = statuses.find((s) => s.statusName.toLowerCase() === 'acknowledged');
        const rejected = statuses.find((s) => s.statusName.toLowerCase() === 'rejected');
        setTentativeStatusId(tentative?.statusId ?? null);
        setAcknowledgedStatusId(acknowledged?.statusId ?? null);
        setRejectedStatusId(rejected?.statusId ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    teamMembersHook.loadTeamMembers();
  }, []);

  useEffect(() => {
    setEditingSwap(null);
    if (selectedTeamMember) {
      swapsHook.loadSwaps(selectedTeamMember.teamMemberId);
    } else {
      swapsHook.clearSwaps();
    }
  }, [selectedTeamMember]);

  const refresh = useCallback(() => {
    if (selectedTeamMember) {
      swapsHook.loadSwaps(selectedTeamMember.teamMemberId);
    }
  }, [selectedTeamMember, swapsHook]);

  const handleSubmit = useCallback(
    async (holidayId: number, replacementDate: string) => {
      if (!selectedTeamMember) return;
      if (editingSwap) {
        await operationsHook.updateSwap(editingSwap.holidaySwapId, { holidayId, replacementDate });
        setEditingSwap(null);
      } else {
        await operationsHook.createSwap(selectedTeamMember.teamMemberId, {
          holidayId,
          replacementDate,
        });
      }
      refresh();
    },
    [selectedTeamMember, editingSwap, operationsHook, refresh]
  );

  const handleEditClick = useCallback((swap: HolidaySwapDTO) => {
    setEditingSwap(swap);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleConfirmCancel = useCallback(
    async (swapId: number, comment: string) => {
      await operationsHook.cancelSwap(swapId, { comment });
      refresh();
    },
    [operationsHook, refresh]
  );

  const handleApprove = useCallback(
    async (swap: HolidaySwapDTO) => {
      if (!acknowledgedStatusId) return;
      await operationsHook.reviewSwap(swap.holidaySwapId, { statusId: acknowledgedStatusId });
      refresh();
    },
    [acknowledgedStatusId, operationsHook, refresh]
  );

  const handleReject = useCallback(
    async (swap: HolidaySwapDTO) => {
      if (!rejectedStatusId) return;
      await operationsHook.reviewSwap(swap.holidaySwapId, { statusId: rejectedStatusId });
      refresh();
    },
    [rejectedStatusId, operationsHook, refresh]
  );

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Team Holiday Swaps</ToolbarPageTitle>
          <ToolbarDescription>
            Create, edit, review, and cancel holiday swaps for your team members.
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      {/* Team member selector */}
      <div className="flex items-center gap-4 mt-6">
        <div className="w-72 shrink-0">
          <TeamMembersDataGrid
            teamMembers={teamMembersHook.teamMembers}
            loading={teamMembersHook.loading}
            selectedTeamMemberId={selectedTeamMember?.teamMemberId ?? null}
            onSelectTeamMember={setSelectedTeamMember}
          />
        </div>
        {selectedTeamMember && (
          <span className="text-lg font-semibold">
            {selectedTeamMember.teamMemberNames} {selectedTeamMember.teamMemberSurnames}
            <span className="text-muted-foreground text-sm font-normal ml-2">
              {selectedTeamMember.workdayId}
            </span>
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="mt-6">
        {selectedTeamMember ? (
          <div className="flex flex-col gap-6">
            <SupervisorSwapForm
              teamMember={selectedTeamMember}
              editingSwap={editingSwap}
              loading={operationsHook.loading}
              onSubmit={handleSubmit}
              onCancelEdit={() => setEditingSwap(null)}
            />
            <SupervisorSwapList
              swaps={swapsHook.swaps}
              loading={swapsHook.loading}
              operationLoading={operationsHook.loading}
              tentativeStatusId={tentativeStatusId}
              acknowledgedStatusId={acknowledgedStatusId}
              onEditClick={handleEditClick}
              onCancelClick={setCancelTarget}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
            Select a team member to manage their holiday swaps.
          </div>
        )}
      </div>

      <CancelSwapDialog
        open={cancelTarget !== null}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        swap={cancelTarget}
        loading={operationsHook.loading}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}

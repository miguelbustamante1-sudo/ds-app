import { useEffect, useState, useCallback } from 'react';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api';
import { useMyTeamMembers } from '@/hooks/useSupervisorTimeOff';
import { TeamMembersDataGrid } from '@/pages/timeoff/supervisor/components/TeamMembersDataGrid';
import { SupervisorSwapDialog } from './components/SupervisorSwapDialog';
import { BulkSwapDialog } from './components/BulkSwapDialog';
import type { BulkSwapItem } from './components/BulkSwapDialog';
import { SupervisorSwapList } from './components/SupervisorSwapList';
import { CancelSwapDialog } from './components/CancelSwapDialog';
import { useSupervisorTeamMemberSwaps } from './hooks/useSupervisorTeamMemberSwaps';
import { useSupervisorSwapOperations } from './hooks/useSupervisorSwapOperations';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export function SupervisorHolidaySwapsPage() {
  const { toast } = useToast();

  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberReportDTO | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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

  const handleBulkSave = useCallback(
    async (items: BulkSwapItem[]) => {
      for (const item of items) {
        await operationsHook.createSwap(item.teamMemberId, item.payload);
      }
      refresh();
    },
    [operationsHook, refresh],
  );

  const handleEditSave = useCallback(
    async (holidayId: number, replacementDate: string) => {
      if (!editingSwap) return;
      await operationsHook.updateSwap(editingSwap.holidaySwapId, { holidayId, replacementDate });
      setEditingSwap(null);
      refresh();
    },
    [editingSwap, operationsHook, refresh],
  );

  const handleCreateSave = useCallback(
    async (holidayId: number, replacementDate: string) => {
      if (!selectedTeamMember) return;
      await operationsHook.createSwap(selectedTeamMember.teamMemberId, { holidayId, replacementDate });
      refresh();
    },
    [selectedTeamMember, operationsHook, refresh],
  );

  const handleEditClick = useCallback((swap: HolidaySwapDTO) => {
    setEditingSwap(swap);
    setEditDialogOpen(true);
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
        <Button onClick={() => setBulkDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Swap(s)
        </Button>
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
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold">
              {selectedTeamMember.teamMemberNames} {selectedTeamMember.teamMemberSurnames}
              <span className="text-muted-foreground text-sm font-normal ml-2">
                {selectedTeamMember.workdayId}
              </span>
            </span>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              New Swap
            </Button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="mt-6">
        {selectedTeamMember ? (
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
        ) : (
          <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
            Select a team member to manage their holiday swaps.
          </div>
        )}
      </div>

      <BulkSwapDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        teamMembers={teamMembersHook.teamMembers}
        loading={operationsHook.loading}
        onSave={handleBulkSave}
      />

      {editingSwap && selectedTeamMember && (
        <SupervisorSwapDialog
          open={editDialogOpen}
          onOpenChange={(v) => { setEditDialogOpen(v); if (!v) setEditingSwap(null); }}
          teamMember={selectedTeamMember}
          editingSwap={editingSwap}
          loading={operationsHook.loading}
          onSave={handleEditSave}
        />
      )}

      {selectedTeamMember && (
        <SupervisorSwapDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          teamMember={selectedTeamMember}
          editingSwap={null}
          loading={operationsHook.loading}
          onSave={handleCreateSave}
        />
      )}

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

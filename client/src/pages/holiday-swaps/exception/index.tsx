import { useEffect, useState, useCallback } from 'react';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { useToast } from '@/hooks/use-toast';
import { apiGet, ApiError } from '@/lib/api';
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
import { parseUTCDateAsLocal } from '@/lib/utils';
import { ExceptionSwapForm } from './components/ExceptionSwapForm';
import { ExceptionSwapList } from './components/ExceptionSwapList';
import { CancelSwapDialog } from '../supervisor/components/CancelSwapDialog';
import { useExceptionTeamMemberSwaps } from './hooks/useExceptionTeamMemberSwaps';
import { useExceptionSwapOperations } from './hooks/useExceptionSwapOperations';
import type { TeamMemberDTO } from '@shared/dto/TeamMember';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export function HolidaySwapExceptionPage() {
  const { toast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberDTO | null>(null);
  const [editingSwap, setEditingSwap] = useState<HolidaySwapDTO | null>(null);
  const [cancelTarget, setCancelTarget] = useState<HolidaySwapDTO | null>(null);
  const [acknowledgedStatusId, setAcknowledgedStatusId] = useState<number | null>(null);
  const [rejectedStatusId, setRejectedStatusId] = useState<number | null>(null);

  const swapsHook = useExceptionTeamMemberSwaps();

  const operationsHook = useExceptionSwapOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  // Load status IDs once
  useEffect(() => {
    apiGet<Array<{ statusId: number; statusName: string }>>('/api/time-off-statuses')
      .then((statuses) => {
        const acknowledged = statuses.find((s) => s.statusName.toLowerCase() === 'acknowledged');
        const rejected = statuses.find((s) => s.statusName.toLowerCase() === 'rejected');
        setAcknowledgedStatusId(acknowledged?.statusId ?? null);
        setRejectedStatusId(rejected?.statusId ?? null);
      })
      .catch(() => {});
  }, []);

  // Load all active team members on mount
  useEffect(() => {
    async function load() {
      try {
        setLoadingTeamMembers(true);
        const data = await apiGet<TeamMemberDTO[]>('/api/team-members');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const active = data.filter((m) => {
          if (!m.teamMemberEndDate) return true;
          return parseUTCDateAsLocal(String(m.teamMemberEndDate)) >= today;
        });
        setTeamMembers(active);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to load team members';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setLoadingTeamMembers(false);
      }
    }
    load();
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

  const handleSelectTeamMember = useCallback(
    (value: string) => {
      const found = teamMembers.find((m) => m.teamMemberId.toString() === value) ?? null;
      setSelectedTeamMember(found);
    },
    [teamMembers]
  );

  const handleSubmit = useCallback(
    async (holidayId: number, replacementDate: string, onBehalfOf: number) => {
      if (!selectedTeamMember) return;
      if (editingSwap) {
        await operationsHook.updateSwap(editingSwap.holidaySwapId, { holidayId, replacementDate });
        setEditingSwap(null);
      } else {
        await operationsHook.createSwap(selectedTeamMember.teamMemberId, {
          holidayId,
          replacementDate,
          onBehalfOf,
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

  const teamMemberOptions: ComboBoxOption[] = teamMembers.map((m) => ({
    value: m.teamMemberId.toString(),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}${m.workdayId ? ` (${m.workdayId})` : ''}`,
  }));

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Holiday Swap Exception</ToolbarPageTitle>
          <ToolbarDescription>
            Create, edit, review, and cancel holiday swaps for any team member without date or status restrictions.
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      {/* Team member selector */}
      <div className="mt-6 flex items-center gap-4">
        <div className="w-80">
          <ComboBox
            options={teamMemberOptions}
            value={selectedTeamMember?.teamMemberId.toString() ?? ''}
            onValueChange={handleSelectTeamMember}
            placeholder={loadingTeamMembers ? 'Loading…' : 'Search team members…'}
          />
        </div>
        {selectedTeamMember && (
          <span className="text-lg font-semibold">
            {selectedTeamMember.teamMemberNames} {selectedTeamMember.teamMemberSurnames}
            {selectedTeamMember.workdayId && (
              <span className="text-muted-foreground text-sm font-normal ml-2">
                {selectedTeamMember.workdayId}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="mt-6">
        {selectedTeamMember ? (
          <div className="flex flex-col gap-6">
            <ExceptionSwapForm
              countryId={selectedTeamMember.countryId ?? null}
              editingSwap={editingSwap}
              loading={operationsHook.loading}
              onSubmit={handleSubmit}
              onCancelEdit={() => setEditingSwap(null)}
            />
            <ExceptionSwapList
              swaps={swapsHook.swaps}
              loading={swapsHook.loading}
              operationLoading={operationsHook.loading}
              acknowledgedStatusId={acknowledgedStatusId}
              rejectedStatusId={rejectedStatusId}
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

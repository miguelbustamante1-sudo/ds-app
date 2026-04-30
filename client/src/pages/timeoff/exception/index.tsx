import { useEffect, useState, useCallback } from 'react';
import type { TeamMemberDTO } from '@shared/dto/TeamMember';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO, UpdateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { useToast } from '@/hooks/use-toast';
import {
  useExceptionTeamMemberTimeOffs,
  useExceptionTimeOffOperations,
} from '@/hooks/useExceptionTimeOff';
import { CancelTimeOffDialog } from '../supervisor/components/CancelTimeOffDialog';
import { ExceptionTimeOffList } from './components/ExceptionTimeOffList';
import { ExceptionTimeOffForm } from './components/ExceptionTimeOffForm';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { apiGet, ApiError } from '@/lib/api';

export function TimeOffExceptionPage() {
  const { toast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberDTO | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [timeOffToCancel, setTimeOffToCancel] = useState<TimeOffWithDetailsDTO | null>(null);
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOffWithDetailsDTO | null>(null);

  const timeOffsHook = useExceptionTeamMemberTimeOffs({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const operationsHook = useExceptionTimeOffOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    async function loadAllTeamMembers() {
      try {
        setLoadingTeamMembers(true);
        const data = await apiGet<TeamMemberDTO[]>('/api/team-members');
        setTeamMembers(data);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to load team members';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setLoadingTeamMembers(false);
      }
    }
    loadAllTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedTeamMember) {
      timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
    } else {
      timeOffsHook.clearTimeOffs();
    }
  }, [selectedTeamMember]);

  const teamMemberOptions: ComboBoxOption[] = teamMembers.map((m) => ({
    value: m.teamMemberId.toString(),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`,
  }));

  const handleSelectTeamMember = useCallback(
    (value: string) => {
      const found = teamMembers.find((m) => m.teamMemberId.toString() === value) ?? null;
      setSelectedTeamMember(found);
    },
    [teamMembers]
  );

  const handleEditClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setEditingTimeOff(timeOff);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTimeOff(null);
  }, []);

  const handleCancelClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setTimeOffToCancel(timeOff);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(
    async (timeOffId: number, comment: string) => {
      await operationsHook.cancelTimeOff(timeOffId, comment);
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  const handleCreateTimeOff = useCallback(
    async (data: CreateSupervisorTimeOffDTO) => {
      await operationsHook.createTimeOff(data);
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  const handleUpdateTimeOff = useCallback(
    async (timeOffId: number, data: UpdateSupervisorTimeOffDTO) => {
      await operationsHook.updateTimeOff(timeOffId, data);
      setEditingTimeOff(null);
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Time Off Exception Entry</ToolbarPageTitle>
          <ToolbarDescription>
            Add time off entries without business rule restrictions (no SV/GT rules, no balance or notice period checks)
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="flex items-center gap-4 mt-6">
        <div className="w-72 shrink-0">
          <ComboBox
            options={teamMemberOptions}
            value={selectedTeamMember?.teamMemberId.toString() ?? ''}
            onValueChange={handleSelectTeamMember}
            placeholder={loadingTeamMembers ? 'Loading...' : 'Select team member'}
            searchPlaceholder="Search team members..."
            emptyMessage="No team members found."
            disabled={loadingTeamMembers}
          />
        </div>
        {selectedTeamMember && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">
              {selectedTeamMember.teamMemberNames} {selectedTeamMember.teamMemberSurnames}
            </span>
            <span className="text-muted-foreground">WDID: {selectedTeamMember.workdayId}</span>
          </div>
        )}
      </div>

      <div className="mt-6">
        {selectedTeamMember ? (
          <div className="flex flex-col gap-6">
            <ExceptionTimeOffForm
              teamMember={selectedTeamMember}
              existingTimeOffs={timeOffsHook.timeOffs}
              onSubmit={handleCreateTimeOff}
              onUpdate={handleUpdateTimeOff}
              onCancelEdit={handleCancelEdit}
              editingTimeOff={editingTimeOff}
              loading={operationsHook.loading}
            />
            <ExceptionTimeOffList
              timeOffs={timeOffsHook.timeOffs}
              loading={timeOffsHook.loading}
              onEditClick={handleEditClick}
              onCancelClick={handleCancelClick}
            />
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
            Select a team member to create an exception entry
          </div>
        )}
      </div>

      <CancelTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={timeOffToCancel}
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />
    </div>
  );
}
